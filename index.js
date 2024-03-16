
import * as fs from "fs";
import * as crypto from "crypto";
import * as cron from "node-cron";
import * as schedule from "node-schedule";
import * as robot from "./robot.js";
import * as isolated from "./isolated.js";

import dotenv from "dotenv";
import * as allParams from "./params.js";


dotenv.config();
const _apiKey    = process.env.BINANCE_API_KEY;
const _apiSecret = process.env.BINANCE_SECRET;

const formatter = robot.formatter;


function logCurrentDay() {
	      const currentDate = new Date();
	      const formattedDate = `${currentDate.getFullYear()}-${currentDate.getMonth() + 1}-${currentDate.getDate()}`;
	      return formattedDate;
}

async function buy(borrowed, symbol, bitcoin, _apiKey, _apiSecret, logStream){
       logStream.write(`Symbol : ${symbol}, quantity : ${bitcoin} \n`); 
let tx = "";
        tx = await isolated.isoBuy( symbol, bitcoin, _apiKey, _apiSecret)
	    logStream.write(`isoBuy and Borrow. \n`); 
        logStream.write(JSON.stringify(tx, null, 2)+`\n`);
    
    return tx;
}

async function sell(symbol, quantity, _apiKey, _apiSecret, logStream){

        logStream.write(`Symbol : ${symbol}, quantity : ${quantity} \n`); 
        let tx = "";   
        
        tx = await isolated.isoShort(symbol, quantity, _apiKey, _apiSecret);

        logStream.write(`isoShort and Borrow. \n`); 
        logStream.write(JSON.stringify(tx, null, 2)+`\n`);
    
    return tx;    
}

async function ENTRY(
	side,
	qty,
	precision,
	sizePrecision,
	stopLoss,
	limitLoss,
	_apiKey,
	_apiSecret,
	logStream,
	fdusd,
	bor,
	bitcoin,
	symbol,
	price
) {
	if (side === "BUY") {
		logStream.write(`quantity ${qty}`);
		const str_bitcoin = qty.toString();
		const new_bitcoin = formatter(str_bitcoin, 1, 5);

		const tx = await buy(
			bor,
			symbol,
			new_bitcoin,
			_apiKey,
			_apiSecret,
			logStream
		);

		/* account has insufficient balance for requested action */

		logStream.write(JSON.stringify(tx, null, 2) + `\n`);
		bitcoin = formatter(tx.executedQty, 0.997, sizePrecision);

		let avgPrice = parseFloat(
			(tx.cummulativeQuoteQty / tx.executedQty).toFixed(precision)
		);
		console.log("avgPrice", avgPrice);
		let stopPrice = formatter(avgPrice, 1 - stopLoss, precision);
		let limit = formatter(avgPrice, 1 - limitLoss, precision);
		console.log(stopPrice, limit);
		/* frequent error BTCFDUSD NaN NaN NaN */
		//console.log(symbol, bitcoin, stopPrice, limit);
		logStream.write(
			`symbol ${symbol}, quantity : ${bitcoin}, stopPrice : ${stopPrice}, limit : ${limit} \n`
		);
		await robot.sleep(500);
		const stopLossTx = await isolated.stopSell(
			symbol,
			"SELL",
			bitcoin,
			stopPrice,
			limit,
			_apiKey,
			_apiSecret
		);
		logStream.write(`placed stop loss\n`);
		logStream.write(JSON.stringify(stopLossTx, null, 2) + `\n`);
		if (Object.hasOwn(stopLossTx, "code")) {
			/* sleep 200ms */
			await robot.sleep(1000);
			stopPrice = formatter(avgPrice, 1 + stopLoss+ 0.001, precision);
			limit = formatter(avgPrice, 1 + limitLoss + 0.001, precision);


			/* replace stop loss a bit wider */
			logStream.write(
				`symbol ${symbol}, quantity : ${bitcoin}, stopPrice : ${stopPrice}, limit : ${limit} \n`
			);
		const stopLossTx2 = await isolated.stopSell(
			symbol,
			"SELL",
			bitcoin,
			stopPrice,
			limit,
			_apiKey,
			_apiSecret
		);
		logStream.write(`placed stop loss 2nd trial\n`);
		logStream.write(JSON.stringify(stopLossTx, null, 2) + `\n`);
		}
	} else {
		// side === "SELL"
		logStream.write(`quantity ${qty}`);
		const str_bitcoin = qty.toString();
		const new_qty = formatter(str_bitcoin, 1, 5);

		const tx = await sell(symbol, new_qty, _apiKey, _apiSecret, logStream);

		logStream.write(JSON.stringify(tx, null, 2) + `\n`);
		bitcoin = formatter(tx.executedQty, 0.997, sizePrecision);

		let avgPrice = parseFloat(
			(tx.cummulativeQuoteQty / tx.executedQty).toFixed(precision)
		);
		//console.log("avgPrice", avgPrice);
		let stopPrice = formatter(avgPrice, 1 + stopLoss, precision);
		let limit = formatter(avgPrice, 1 + limitLoss, precision);
		//console.log(stopPrice, limit);
		/* frequent error BTCFDUSD NaN NaN NaN */
		//console.log(symbol, bitcoin, stopPrice, limit);
		logStream.write(
			`symbol ${symbol}, quantity : ${bitcoin}, stopPrice : ${stopPrice}, limit : ${limit} \n`
		);
		await robot.sleep(500);
		const stopLossTx = await isolated.stopBuy(
			symbol,
			"BUY",
			bitcoin,
			stopPrice,
			limit,
			_apiKey,
			_apiSecret
		);
		logStream.write(`placed stop loss\n`);
		logStream.write(JSON.stringify(stopLossTx, null, 2) + `\n`);
		if (Object.hasOwn(stopLossTx, "code")) {
			/* sleep 200ms */
			await robot.sleep(1000);
			stopPrice = formatter(avgPrice, 1 + stopLoss+ 0.001, precision);
			limit = formatter(avgPrice, 1 + limitLoss + 0.001, precision);

			/* replace stop loss a bit wider */
			logStream.write(
				`symbol ${symbol}, quantity : ${bitcoin}, stopPrice : ${stopPrice}, limit : ${limit} \n`
			);
			const stopLossTx2 = await isolated.stopBuy(
				symbol,
				"BUY",
				bitcoin,
				stopPrice,
				limit,
				_apiKey,
				_apiSecret
			);
			logStream.write(`placed stop loss on second attempt\n`);
			logStream.write(JSON.stringify(stopLossTx, null, 2) + `\n`);
		}
	}
}


async function GET_PRICE(symbol){/* add logStream */
    try {
	    const price  = await robot.getTickerPrice(symbol); 
        return price;
    }catch(e){
        console.log(e);
        
    }
}


function PARAMS(symbol){
    // find params
 //   all_params = allParams;
let all_params =  allParams.allParams;
    const params = all_params.find(x => x.name==symbol);
    console.log(params);
    let par = { precision : params.pricePrecision, 
                sizePrecision : params.sizePrecision
    };
    console.log(par);
    return par;
}

async function strat(side,  qty, symbol, asset,  stopLoss, limitLoss, logStream,tres=null) {


    let {precision, sizePrecision} = PARAMS(symbol);

    //console.log(` precision is ${precision}, sizePrecision is ${sizePrecision}`);
    
    const currentDate   = new Date();
    const logMsg        = `\n\n ***** ${currentDate} *****  \n`;

    logStream.write(logMsg);

    let  error=null, borUsd=null, freeUsd=null, borAsset=null, freeAsset=0 ;//= await TEST_BALANCE(symbol,  asset, _apiKey, _apiSecret, logStream );

    const price = await GET_PRICE(symbol);

    const c = await treshold(side, symbol, price, tres);// returns what ???

    if(c===true){
        const entry      = await ENTRY(side, qty, precision, sizePrecision, stopLoss, limitLoss, _apiKey, _apiSecret, logStream, freeUsd, borUsd, freeAsset, symbol, price);
    }else{
        const log2 = `\ndid not pass treshold condition on ${symbol}, price = ${price}, treshold = ${tres} \n`;
        
        logStream.write(log2);
    }

	setTimeout(()=>{
		logStream.end();
		logStream.destroy();
	}, 9000);

}

async function treshold(side, symbol, price, t){ // check price, return true is p>cond
    if(side==="BUY"){
        return t==null?false:(price >= t);
    }else if(side==="SELL"){
        return t==null?false:(price <= t);
    }else{
        return false;
    }
} 

async function multi(logStream){
    //
    //const one = await strat("BUY", 0.060, "BTCFDUSD","BTC",  0.0025,0.0035,logStream,53500); 
	
//	await robot.sleep(100);
    
     //await robot.sleep(400);
    const two = await strat("BUY", 0.010, "BTCUSDT","BTC",  0.01,0.0150,logStream,70000); 
    const sol= await strat("BUY", 1, "SOLUSDT","SOL",  0.025,0.029,logStream,143);//4.4
    //await robot.sleep(500);
    //const link = await strat("BUY", 7, "LINKUSDT","LINK",0.015,0.019,logStream,20.8);
    //const ltc  = await strat("SELL",1 , "LTCBTC",  "LTC", 0.010,0.013,logStream, 0.00129);//1

    //const wld = await strat("BUY", 18, "WLDUSDT", "WLD", 0.020, 0.025, logStream, 9.5);	
    //const avax = await strat("BUY", 1, "AVAXUSDT", "AVAX", 0.005,0.006, logStream, 41);
    //const ustc = await strat("BUY", 2000, "USTCUSDT", "USTC", 0.025, 0.0299, logStream,0.0375);
    //const sei = await strat("BUY", 25, "SEIUSDT", "SEI", 0.01,0.013,logStream, 0.87);
    await robot.sleep(500);

    const stx = await strat("BUY", 20, "STXUSDT", "STX", 0.045, 0.050, logStream,3.1);
    const fet =await strat("BUY", 25, "FETUSDT", "FET", 0.05, 0.055, logStream, 2.27);
 
    await robot.sleep(500);

    const eth = await strat("BUY", 0.15, "ETHUSDT", "ETH", 0.01,0.015, logStream, 3800);
    const pepe=await strat("BUY",5000000,"PEPEUSDT","PEPE", 0.050, 0.055, logStream,0.000009); 

    await robot.sleep(500);

    const paxgBtc= await strat("SELL", 0.1, "PAXGBTC", "PAXG", 0.01, 0.015, logStream, 0.033);
    const agix=await strat("BUY", 25, "AGIXUSDT", "AGIX", 0.05,0.055, logStream, 1.25);
    //const fil = await strat("BUY", 2.5, "FILFDUSD", "FIL", 0.045, 0.050, logStream, 8.5);

    await robot.sleep(500);

    const shib=await strat("BUY", 1000000,"SHIBUSDT", "SHIB", 0.055, 0.059, logStream, 0.000034);
    const bnb = await strat("BUY", 0.6, "BNBUSDT", "BNB", 0.010,0.015,logStream,505); 
	
    await robot.sleep(500);

    const bch = await strat("BUY", 0.15, "BCHUSDT", "BCH", 0.045, 0.05, logStream, 400);
    const doge= await strat("BUY", 1000, "DOGEUSDT", "DOGE", 0.035,0.039, logStream, 0.17);

}

async function multiFast(logStream){
	    //const one = await strat("BUY", 0.055, "BTCFDUSD","BTC",  0.0045,0.0055,logStream,53500); 

    //const usdc = await strat("BUY",0.04, "BTCUSDC","BTC", 0.006,0.007,logStream,53500);
           await robot.sleep(100);

   
   }

async function fastest(logStream){
    //const bnb = await strat("BUY", 0.25, "BNBUSDT", "BNB", 0.015,0.017,logStream,358); 
    //const wld = await strat("BUY", 2, "WLDUSDT", "WLD", 0.020, 0.023, logStream, 7.7);	
}
/*
 * isoShort
 * stopBuy;
 * ADD FUNCTION SLEEP
 */
const m15 = "55 14,29,44,59 * * * *";
const h1= "55 59 * * * *";//H1
const h4= "55 59 3,7,11,15,19,23 * * *";//H4
const h8= "50 59 7,15,23 * * *";
const h12 = "50 59 11,23 * * *";
const d1  = "47 59 23 * * *";

//const test=  "50 20  11 * * *";



let slow  = schedule.scheduleJob(d1, function (){
	const day = logCurrentDay();
    const logStream = fs.createWriteStream(`./logs/${day}.log`, {flags:'a'});
    multi(logStream);
});



let fast  = schedule.scheduleJob(h4, function (){
	const day = logCurrentDay();
    const logStream = fs.createWriteStream(`./logs/${day}_H4.log`, {flags:'a'});
    multiFast(logStream);
});

/*
let faster = schedule.scheduleJob(m15, function (){
	const day = logCurrentDay();
        const logStream = fs.createWriteStream(`./logs/${day}.log`, {flags:'a'});
	fastest(logStream);
});
*/



