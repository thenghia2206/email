import { Controller, Route, Tags, Post, Body, Get, Request, Security, Put, Query, Path, Delete } from "tsoa";
import { successResponse, failedResponse, IListResponse } from "../../utils/http";
import axios from "axios";
import Mail from "./mail.model";
import { IMail } from "./mail.types";
import {getEmails, queryAllGmails, queryOneEmail} from "../../services";
// import Gmail from "./gmail.model";
// import { oAuth2Client } from "../../app";

@Route("Mails")
@Tags("Mails")
export class MailController extends Controller {

    // @Post("create-mail")
    // public async createMail(@Body() data: IMail): Promise<any> {
    //     try {
    //         const mail = await Mail.create(data);
    //         return successResponse(mail);
    //     } catch (err) {
    //         this.setStatus(500);
    //         return failedResponse('Execute service went wrong', 'ServiceException');
    //     }
    // }

    // @Get("get-user")
    // public async getUser(@Query() email: string): Promise<any> {
    //     try {
    //         console.log("email", email);
            
    //         // const url = `https://gmail.googleapis.com/gmail/v1/users/${email}/profile`;
    //         // const { token } = await oAuth2Client.getAccessToken();
    //         // console.log(token);
            
    //         // const config = generateConfig(url, token);
    //         // const response = await axios(config);
    //         return successResponse("haha");
    //     }
    //     catch (err) {
    //         this.setStatus(500);
    //         return failedResponse('Execute service went wrong', 'ServiceException');
    //     }
    // }

    /**
     * @summary Get all mails from database 
     * @returns 
     */
    @Get("get-mails")
    public async getMails(): Promise<any> {
        try {
            const res = await queryAllGmails()
            return successResponse(res);
        }
        catch (err) {
            this.setStatus(500);
            return failedResponse('Execute service went wrong', 'ServiceException');
        }
    }


    // @Get("get-data")
    // public async getData(): Promise<any> {
    //     try {
    //         const result = await getEmails();
    //         // return successResponse(result);
    //         // const gmails = Gmail.find()
    //         // return successResponse(gmails);
    //         // const res = await queryAllGmails()
    //         return successResponse("OK");
    //     }
    //     catch (err) {
    //         this.setStatus(500);
    //         return failedResponse('Execute service went wrong', err);
    //     }
    // }

    /**
     * @summary Get file of a mail
     * @param id
     */
    @Get("get-file/{id}")
    public async getImage(@Path() id: string): Promise<any> {
        try {
            const email = await queryOneEmail(id);
            const fileLinks = email.fileLinks;
            // const file = fs.readFileSync(fileLinks[0]);
            // return successResponse(image);
        }
        catch (err) {
            this.setStatus(500);
            return failedResponse('Execute service went wrong', err);
        }
    }
    
}


