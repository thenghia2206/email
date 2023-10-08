// src/app.ts
import express, {
  Response as ExResponse,
  Request as ExRequest,
  NextFunction,
  json,
  urlencoded,
} from "express";
import { ValidateError } from "tsoa";
import { RegisterRoutes } from './routes';
import swaggerUi = require('swagger-ui-express');
import fs from 'fs';
import cors from 'cors';
import mongoose from "mongoose";
import cron from 'node-cron';

import './components/mail/mail.controller'
import { cloneEmails, getEmails } from "./services";



const app = express();



mongoose.connect(process.env.MONGO_DB ?? '', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useCreateIndex: true,
  useFindAndModify: false,
  user: process.env.MONGO_USER,
  pass: process.env.MONGO_PASS,
  dbName: process.env.MONGO_DB_NAME,
}).then(() => console.log('Connected to mongodb')).catch(err => { console.log(process.env.MONGO_DB); console.log({ err }) });


app.use(cors());

/* Swagger files start */
const swaggerFile: any = (process.cwd() + "/swagger.json");
const swaggerData: any = fs.readFileSync(swaggerFile, 'utf8');
const swaggerDocument = JSON.parse(swaggerData);
/* Swagger files end */


app.use(
  urlencoded({
    extended: true,
  })
);
app.use(json());


RegisterRoutes(app);

app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));


// catch 404 and forward to error handler
app.use(function errorHandler(
  err: unknown,
  req: ExRequest,
  res: ExResponse,
  next: NextFunction
): ExResponse | void {
  if (err instanceof ValidateError) {
    console.warn(`Caught Validation Error for ${req.path}:`, err.fields);
    return res.status(422).json({
      message: "Validation Failed",
      details: err?.fields,
    });
  }
  if (err instanceof Error) {
    return res.status(500).json({
      message: "Internal Server Error",
    });
  }

  next();
});

//missed routes
app.use(function notFoundHandler(_req, res: ExResponse) {
  res.status(404).send({
    message: "Not Found",
  });
});


// cron run every 15 minutes
cron.schedule('*/15 * * * * *', () => {
  console.log('crawl gmail every 15 minutes');
  getEmails();
});

//cron run every 5 minutes
cron.schedule('*/5 * * * * *', () => {
  console.log('crawl gmail every 5 minutes');
  cloneEmails();
});




export { app };