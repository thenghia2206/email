// import mongoose, { Document, Model} from "mongoose";
// import { IMail } from "./mail.types";

// interface GmailDocument extends IMail, Document { };
// interface GmailModel extends Model<GmailDocument> { };

// const GmailSchema = new mongoose.Schema<GmailDocument, GmailModel> ( {
//     from : String,
//     to : String,
//     subject : String,
//     text : String,
//     html : String,
//     fileLinks : [String],
//     createdAt : Date,
//     updatedAt : Date
// })

// GmailSchema.set('toJSON', {
//     virtuals : true,
//     versionKey : false,
//     transform: function ( doc, ret ) { delete ret._id }
// });

// const Gmail = mongoose.model<GmailDocument, GmailModel>('Gmail', GmailSchema);

// export default Gmail;