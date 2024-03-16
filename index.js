
import dotenv from "dotenv";
import * as fs from "fs";
import * as crypto from "crypto";
import * as cron from "node-cron";
import * as schedule from "node-schedule";
import * as robot from "./utils/robot.js";
import * as isolated from "./exchangeApi/isolated.js";
/* create a spot api */
import * as allParams from "./config/params.js";
import * as strat from "./strategy/logic.js";


const m5  = "57 */5 * * * *";
const m15 = "55 14,29,44,59 * * * *";
const h1= "55 59 * * * *";//H1
const h4= "55 59 3,7,11,15,19,23 * * *";//H4
const h8= "50 59 7,15,23 * * *";
const h12 = "50 59 11,23 * * *";
const d1  = "47 59 23 * * *";


let slow  = schedule.scheduleJob(d1, function (){
//	const day = logCurrentDay();
//    const logStream = fs.createWriteStream(`./logs/${day}.log`, {flags:'a'});
/* YOUR STRATEGY HERE */
});


