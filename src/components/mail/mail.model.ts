import mongoose, { Document, Model} from "mongoose";
import { IMail } from "./mail.types";

interface MailDocument extends IMail, Document { };
interface MailModel extends Model<MailDocument> { };

const MailSchema = new mongoose.Schema<MailDocument, MailModel> ( {
    from : String,
    to : String,
    subject : String,
    text : String,
    html : String,
    fileLinks : [String],
    createdAt : Date,
    updatedAt : Date
})

MailSchema.set('toJSON', {
    virtuals : true,
    versionKey : false,
    transform: function ( doc, ret ) { delete ret._id }
});

const Mail = mongoose.model<MailDocument, MailModel>('Mail', MailSchema);

export default Mail;