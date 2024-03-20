
import dotenv from "dotenv";
import * as fs from "fs";
import * as crypto from "crypto";
import * as cron from "node-cron";
import * as schedule from "node-schedule";
import * as robot from "../utils/robot.js";
import * as isolated from "../exchangeApi/isolated.js";
import * as allParams from "../config/params.js";
/* create a spot api */

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

//async function strat(side,  qty, symbol, asset,  stopLoss, limitLoss, tres=null, logStream) {
async function strat({side,  qty, name, asset,  stop, limit, range=null}, logStream) {
    let symbol = name;
    let stopLoss =stop;
    let limitLoss= limit;
    let tres = range;

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
    
}

async function multiFast(logStream){
   
   }

async function single (logStream){

    const usdc = await strat("SELL",0.001, "BTCUSDC","BTC", 0.001,0.0015,logStream,66800);
}


export {
    logCurrentDay,
    multi,
    multiFast,
   single,
    strat
};

