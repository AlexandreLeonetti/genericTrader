// this is the module containing basic functions.
//const crypto = require("crypto");
import * as crypto from "crypto";

async function sleep(ms) {
      return new Promise((resolve) => {
                  setTimeout(resolve, ms);
      });
}


function formatter(s, factor, precision){
        let n = factor*parseFloat(s);
        let p = Math.pow(10, precision)
        n = Math.trunc(n*p)/p;
        n = parseFloat(n.toFixed(precision));
        return n
}



async function  getTickerPrice(symbol){
        try{
        const priceFetch = await fetch(`http://binance.com/api/v3/ticker/price?symbol=${symbol}`)
        const priceBody  = await priceFetch.json();
        return parseFloat(priceBody.price);

        }catch(error){
                            console.error("Error",error);
                            throw error;
        }

}
async function isAboveMa(x){
	    try {
		            const priceFetch = await fetch(`http://16.170.155.76:5000/sig`);

		            const data       = await priceFetch.json();
                    const _ma25       = data.ma25;
                    const _ma400       = data.ma400;
                    
                    const ma25      = formatter(_ma25,1,2);
                    const ma400      = formatter(_ma400,1,2);

		            const maPrice    = ma25/*extract price*/;
		            const isAboveMa25   = x>=ma25*1.0014; /* true if x is 0.14% above ma*/
                    const ma25AboveMa400 = ma25>= ma400*0.9999;
                    const b = isAboveMa25 && ma25AboveMa400; 
		            const obj = {isAbove: b, maPrice: maPrice}
		            //console.log(obj);
		            return obj ;
		        }catch(err){
				        console.error("err in isAboveMa : ", err);
				        throw err;
				    }
}

async function isAboveSlowMa(x){
	    try {
		            const priceFetch = await fetch(`http://16.170.155.76:5000/sig`);
		            const data       = await priceFetch.json();
                    const _ma400     = data.ma400;
                    const ma400      = formatter(_ma400,1,2);

		            const maPrice    = ma400/*extract price*/;
		            const isAboveMa400   = x>=ma400; /* true if x is  above ma*/
                    const b = isAboveMa400 ; 
		            const obj = {isAbove: b, maPrice: maPrice}
		            return obj ;
		        }catch(err){
				        console.error("err in isAboveMa : ", err);
				        throw err;
				}
}

/*
module.exports.getTickerPrice   = getTickerPrice;
module.exports.formatter        = formatter;
module.exports.isAboveMa        = isAboveMa;
module.exports.isAboveSlowMa    = isAboveSlowMa;
module.exports.sleep            = sleep;
*/
export {
    getTickerPrice,
    formatter,
    isAboveMa,
    isAboveSlowMa,
    sleep
};



/* rebuild isAboveDailyMa and isAboveSlowDailyMa 
 * replace ma400 by ma50; 
 * condition is isAboveMa10*1.02 and isAboveMa50. 
 * no need for ma10 to be above ma50.
 *
 * */
