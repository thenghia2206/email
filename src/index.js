const { google } = require('googleapis');
const fs = require('fs');
const readline = require('readline');
const path = require('path');

// Đường dẫn đến file credentials.json
const CREDENTIALS_PATH = 'src/credentials.json';

// Đường dẫn đến file token.json, sẽ được tạo tự động sau khi xác thực
const TOKEN_PATH = 'src/token.json';

// Phạm vi truy cập của Gmail API
const SCOPES = ['https://www.googleapis.com/auth/gmail.modify'];

// Hàm xác thực OAuth 2.0
function authenticate(callback) {
  const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH));
  const { client_secret, client_id, redirect_uris } = credentials.web;
  const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

  // Kiểm tra xem đã có file token.json chứa thông tin xác thực hay chưa
  fs.readFile(TOKEN_PATH, (err, token) => {
    if (err) {
      return getNewToken(oAuth2Client, callback);
    } else {
      oAuth2Client.setCredentials(JSON.parse(token));
      return callback(oAuth2Client);
    }
  });
}

function decodeBase64Url(base64Url) {
  const padding = '='.repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = (base64Url + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = Buffer.from(base64, 'base64');
  return rawData.toString('utf-8');
}

function parseEmail(email) {
  console.log('Tiêu đề:', email.subject);
  console.log('Nội dung:', email.text);
}

function downloadAttachments(email) {
  if (email.attachments && email.attachments.length > 0) {
    email.attachments.forEach((attachment, index) => {
      const filename = attachment.filename;
      const content = attachment.content;

      const storageDir = path.join(__dirname, 'storage');
      const filePath = path.join(storageDir, filename);

      fs.writeFile(filePath, content, 'binary', function(err) {
        if (err) {
          console.log('Lỗi khi tải xuống file đính kèm:', err);
        } else {
          console.log(`Đã tải xuống file đính kèm ${filename}`);
        }
      });
    });
  }
}

// Hàm lấy toàn bộ email
function getAllEmails(auth) {
  const gmail = google.gmail({ version: 'v1', auth });

  gmail.users.messages.list(
    {
      userId: 'me',
      q: 'in:inbox is:unread',
    },
    
    (err, res) => {
      if (err) {
        console.error('Lỗi khi lấy email:', err);
        return;
      }

      const messages = res.data.messages;
    console.log("---------------------------");
    console.log(res.data.nextPageToken);
      if (messages && messages.length > 0) {
        messages.forEach((message) => {
          gmail.users.messages.get(
            {
              userId: 'me',
              id: message.id,
              format: 'full',
            },
            (err, res) => {
              if (err) {
                console.error('Lỗi khi lấy thông tin chi tiết của email:', err);
                return;
              }

              const email = res.data;
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
                  parts.forEach((part) => {
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

                      gmail.users.messages.attachments.get(
                        {
                          userId: 'me',
                          messageId: message.id,
                          id: part.body.attachmentId,
                        },
                        (err, res) => {
                          if (err) {
                            console.error('Lỗi khi tải file đính kèm:', err);
                            return;
                          }

                          const attachmentData = res.data;
                          if (attachmentData && attachmentData.data) {
                            attachment.content = Buffer.from(attachmentData.data,'base64')
                            parsedEmail.attachments.push(attachment);
                            if (parsedEmail.attachments.length === parts.filter((part) => part.body.attachmentId).length) {
                              parseEmail(parsedEmail);
                              downloadAttachments(parsedEmail);
                              markAsRead(gmail, message.id);
                            }
                          }
                        }
                      );
                    }
                  });
                } else if (email.payload.body && email.payload.body.data) {
                  parsedEmail.text = decodeBase64Url(email.payload.body.data);
                  parseEmail(parsedEmail);
                  markAsRead(gmail, message.id);
                }
              }
            }
          );
        });
      }
    }
  );
}

// Hàm đánh dấu email đã đọc
function markAsRead(gmail, messageId) {
  gmail.users.messages.modify(
    {
      userId: 'me',
      id: messageId,
      resource: {
        removeLabelIds: ['UNREAD'],
      },
    },
    (err, res) => {
      if (err) {
        console.error('Lỗi khi đánh dấu email đã đọc:', err);
      } else {
        console.log('Đã đánh dấu email đã đọc');
      }
    }
  );
}

// Hàm lấy token mới nếu chưa có token hoặc hết hạn
function getNewToken(oAuth2Client, callback) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
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
        return;
      }

      oAuth2Client.setCredentials(token);

      fs.writeFileSync(TOKEN_PATH, JSON.stringify(token));

      return callback(oAuth2Client);
    });
  });
}

// Xác thực và lấy toàn bộ email
authenticate(getAllEmails);
