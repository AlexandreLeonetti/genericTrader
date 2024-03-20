
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

const m1 = "57 * * * * * ";
const m5  = "57 4,9,14,19,24,29,34,39,44,49,54,59 * * * *";
const m15 = "55 14,29,44,59 * * * *";
const h1= "55 59 * * * *";//H1
const h4= "55 59 3,7,11,15,19,23 * * *";//H4
const h8= "50 59 7,15,23 * * *";
const h12 = "50 59 11,23 * * *";
const d1  = "47 59 23 * * *";

const pair = {
    side : "SELL",
    qty  : 0.1,
    name : "ETHUSDT",
    asset: "ETH",
    stop : 0.0007,
    limit: 0.001,
    range: 3300 
}

let interval  = schedule.scheduleJob(m15, function (){
	const day = strat.logCurrentDay();
    const logStream = fs.createWriteStream(`./logs/${day}.log`, {flags:'a'});
    //strat.single(logStream);
    const doge = strat.strat(
        pair,
        logStream
    );
});


