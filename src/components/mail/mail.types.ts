export interface IMail {
    from: string;
    to: string;
    subject: string;
    text: string;
    html: string;
    fileLinks?: string[];

}

export interface IMailResponse {
    accepted: string[];
    rejected: string[];
    envelopeTime: number;
    messageTime: number;
    messageSize: number;
    response: string;
    envelope: {
        from: string;
        to: string[];
    };
    messageId: string;
}

    
