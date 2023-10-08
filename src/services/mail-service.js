const express = require('express');
const router = express.Router();
const { google } = require('googleapis');
const fs = require('fs').promises;
const readline = require('readline');
const path = require('path');
const Gmail = require('./gmailSchema');
const CloneMail = require('./cloneMailSchema');
// const Mail = require('./mailModel');
// Đường dẫn đến file credentials.json
const CREDENTIALS_PATH = 'src/services/credentials.json';

// Đường dẫn đến file token.json, sẽ được tạo tự động sau khi xác thực
const TOKEN_PATH = 'src/services/token.json';

// Phạm vi truy cập của Gmail API
const SCOPES = ['https://www.googleapis.com/auth/gmail.modify'];

// Hàm xác thực OAuth 2.0
async function authenticate() {
  const credentials = JSON.parse(await fs.readFile(CREDENTIALS_PATH));
  const { client_secret, client_id, redirect_uris } = credentials.web;
  const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

  try {
    const token = await fs.readFile(TOKEN_PATH);
    oAuth2Client.setCredentials(JSON.parse(token));
    // Kiểm tra xem access token có hết hạn hay không
    if (oAuth2Client.isTokenExpiring()) {
      // Nếu access token hết hạn, sử dụng refresh token để lấy access token mới
      await oAuth2Client.refreshToken(oAuth2Client.credentials.refresh_token);
      const newToken = oAuth2Client.credentials;
      // Lưu access token mới vào file token.json
      await fs.writeFile(TOKEN_PATH, JSON.stringify(newToken));
    }
  } catch (error) {
    await getNewToken(oAuth2Client);
  }

  return oAuth2Client;
}

function decodeBase64Url(base64Url) {
  const padding = '='.repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = (base64Url + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = Buffer.from(base64, 'base64');
  return rawData.toString('utf-8');
}

async function parseEmail(email) {
  //save email to database mongodb
  // console.log(email);
  // console.log('Tiêu đề mới:', email.subject);
  // console.log('Nội dung mới:', email.text);
  const fileLinks = await downloadAttachments(email);
  // console.log(fileLinks);
  const newGmail = new Gmail({
    from: email.from.text,
    to: "My gmail",
    subject: email.subject,
    text: email.text,
    fileLinks: fileLinks,
    createdAt: new Date(),
    updatedAt: new Date()
  });
  newGmail.save()

  // const newMail = new Mail({
  //   from: email.from.text,
  //   to: "My gmail",
  //   subject: email.subject,
  //   text: email.text,
  //   fileLinks: fileLinks,
  //   createdAt: new Date(),
  //   updatedAt: new Date()
  // });
  // newMail.save()
}

async function downloadAttachments(email) {
  if (email.attachments && email.attachments.length > 0) {
    var fileLinks = [];
    for (const attachment of email.attachments) {
      const { filename, content } = attachment;
      const storageDir = path.join(__dirname, 'storage');
      const filePath = path.join(storageDir, filename);
      const fileDir = './src/services/storage' + filename;
      // Tạo thư mục lưu trữ nếu chưa tồn tại
      try {
        await fs.writeFile(filePath, content, 'binary');
        console.log(`Đã tải xuống file đính kèm ${filename}`);
      } catch (error) {
        console.log('Lỗi khi tải xuống file đính kèm:', error);
      }
      fileLinks.push(fileDir);
    }
    return fileLinks;
  }


}

// Hàm lấy toàn bộ email id
async function cloneMailId(auth) {
  const gmail = google.gmail({ version: 'v1', auth });
  var emailsResult = [];
  try {
    const res = await gmail.users.messages.list({
      userId: 'me',
      q: 'in:inbox is:unread',
    });
    const messages = res.data.messages;
    if (messages && messages.length > 0) {
      for (const message of messages) {
        const clone = new CloneMail({
          emailId : message.id,
          status : 0,
        })
        await clone.save()
        markAsRead(gmail,message.id)
      }
    }
    // return emailsResult;
  } catch (error) {
    console.error('Lỗi khi lấy email:', error);
    return emailsResult;
  }
}

// Hàm lấy toàn bộ email
async function getAllEmails(auth) {
  const gmail = google.gmail({ version: 'v1', auth });
  var emailsResult = [];
  try {
    const messages = await CloneMail.find({status : 0})
    if (messages && messages.length > 0) {
      for (const message of messages) {
        const emailRes = await gmail.users.messages.get({
          userId: 'me',
          id: message.emailId,
          format: 'full',
        });

        const email = emailRes.data;
        if (email.payload) {
          const parsedEmail = {
            subject: email.payload.headers.find((header) => header.name === 'Subject').value,
            from: {
              text: email.payload.headers.find((header) => header.name === 'From').value,
            },
            text: '',
            attachments: [],
          };

          const parts = email.payload.parts;
          if (parts) {
            for (const part of parts) {
              if (part.mimeType === 'text/plain') {
                parsedEmail.text = decodeBase64Url(part.body.data);
              } else if (part.mimeType === 'multipart/alternative') {
                const body = part.parts.find((subPart) => subPart.mimeType === 'text/plain');
                if (body && body.body.data) {
                  parsedEmail.text = decodeBase64Url(body.body.data);
                }
              } else if (part.body.attachmentId) {
                const attachment = {
                  filename: part.filename,
                  content: '',
                };

                const attachmentRes = await gmail.users.messages.attachments.get({
                  userId: 'me',
                  messageId: message.emailId,
                  id: part.body.attachmentId,
                });

                const attachmentData = attachmentRes.data;
                if (attachmentData && attachmentData.data) {
                  attachment.content = Buffer.from(attachmentData.data, 'base64');
                  parsedEmail.attachments.push(attachment);
                  if (parsedEmail.attachments.length === parts.filter((part) => part.body.attachmentId).length) {
                    parseEmail(parsedEmail);
                    // await downloadAttachments(parsedEmail);
                    await CloneMail.findOneAndUpdate({emailId : message.emailId},{status : 1})
                    // await markAsRead(gmail, message.emailId);
                  }
                }
              }
            }
          } else if (email.payload.body && email.payload.body.data) {
            parsedEmail.text = decodeBase64Url(email.payload.body.data);
            parseEmail(parsedEmail);
            // var resmail = {
            //   subject: parsedEmail.subject,
            //   text: parsedEmail.text
            // }
            // emailsResult.push(resmail);
            await CloneMail.findOneAndUpdate({emailId : message.emailId},{status : 1})
            // await markAsRead(gmail, message.emailId);
          }
        }
      }
    }
    // return emailsResult;
  } catch (error) {
    console.error('Lỗi khi lấy email:', error);
    return emailsResult;
  }
}

// Hàm đánh dấu email đã đọc
async function markAsRead(gmail, messageId) {
  try {
    await gmail.users.messages.modify({
      userId: 'me',
      id: messageId,
      resource: {
        removeLabelIds: ['UNREAD'],
      },
    });
    console.log('Đã đánh dấu email đã đọc');
  } catch (error) {
    console.error('Lỗi khi đánh dấu email đã đọc:', error);
  }
}

// Hàm lấy token mới nếu chưa có token hoặc hết hạn
function getNewToken(oAuth2Client) {
  return new Promise((resolve, reject) => {
    const authUrl = oAuth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
      prompt: 'consent',
    });

    console.log('Authorize this app by visiting this url:', authUrl);

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    rl.question('Enter the code from that page here: ', (code) => {
      rl.close();

      oAuth2Client.getToken(code, (err, token) => {
        if (err) {
          console.error('Error retrieving access token', err);
          reject(err);
          return;
        }

        oAuth2Client.setCredentials(token);

        fs.writeFile(TOKEN_PATH, JSON.stringify(oAuth2Client.credentials))
          .then(() => {
            resolve();
          })
          .catch((error) => {
            reject(error);
          });
      });
    });
  });
}


async function getAllGmails() {
  //find and sort by createdAt
  const mails = await Gmail.find().sort({ createdAt: -1 });
  return mails;
}
// Xác thực và lấy toàn bộ email
// authenticate(getAllEmails);

async function getOneEmail(id) {
  const mail = await Gmail.find({ _id: id });
  return mail;
}



module.exports = {
  authenticate,
  getAllEmails,
  markAsRead,
  getNewToken,
  decodeBase64Url,
  parseEmail,
  downloadAttachments,
  getAllGmails,
  getOneEmail,
  cloneMailId
};

