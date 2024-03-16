// this is the module containing basic functions.
//const crypto = require("crypto");
import * as crypto from "crypto";


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


/* change getBtcDebt into getFdusdDebt */
async function getIsoDebt(symbol, apiKey, apiSecret){
    try{
        const timestamp = Date.now();
        const endpoint  = "https://api.binance.com/sapi/v1/margin/isolated/account";
        const params = {
                            symbols   : symbol,
                            timestamp : timestamp
                        };
        let queryString = Object.keys(params).map(key => `${key}=${encodeURIComponent(params[key])}`).join("&");
        
        const signature =  crypto.createHmac("sha256", apiSecret)
        .update(queryString)
        .digest("hex");

        queryString+="&signature="+signature;
        
        const url = endpoint + "?" + queryString;

        const request = await fetch(url, {
                            method:"GET",
                            headers:{
                                "X-MBX-APIKEY" : apiKey,
                                "Content-Type" : "application/x-www-form-urlencoded"
                            }
        });

        const response = await request.json();
        //console.log(response);
        const respArr= response.assets;
        const assetInfo = respArr[0].baseAsset;/*respArr.find((e) => e.asset === "FDUSD");*/
        const usdInfo = respArr[0].quoteAsset; //respArr.find((e) => e.asset === "BTC");
        //console.log(usdInfo);
        //console.log(assetInfo);
        
        const usdBorrowed = formatter(usdInfo.borrowed, 1, 2);
        const assetBorrowed = formatter(assetInfo.borrowed, 1, 5);

        const freeUsd = formatter(usdInfo.free,1,2);
        const assetFree     = formatter(assetInfo.free,1,5);
        //console.log(usdBorrowed, freeUsd, assetFree, assetBorrowed);
        return {error : false ,borUsd: usdBorrowed, freeUsd : freeUsd,  freeAsset : assetFree, borAsset: assetBorrowed}; 
    }catch(err){
        
        console.log("err in getting balance", err);
        return { error : true, reason : err};
    }
}


async function isoBuy(symbol, quantity, apiKey, apiSecret){
    try{
         const timestamp= Date.now();
       const endpoint = "https://api.binance.com/sapi/v1/margin/order";
             const params ={
                                    symbol,
                                    isIsolated : "TRUE",
                                    side : "BUY",
                                    type : "MARKET",/*MARKET*/
                                    /*quoteOrderQty,*/
                                    quantity: quantity,
                                    /*price : 40000,*/
                                    newOrderRespType:"FULL",
                                    sideEffectType : "AUTO_BORROW_REPAY",
                                    /*timeInForce : "GTC", *//* mandatory for limit orders */
                                    timestamp
                            };
            //console.log(params);

             let queryString = Object.keys(params).map(key=> `${key}=${encodeURIComponent(params[key])}`).join("&");

                    const signature = crypto.createHmac("sha256", apiSecret)
                    .update(queryString)
                    .digest("hex");

                    queryString+="&signature="+signature;

                    const url = endpoint + "?" + queryString;
                    const request = await  fetch(url, {
                                    method:"POST",
                                    headers:{
                                                        "X-MBX-APIKEY": apiKey,
                                                        "Content-Type": "application/x-www-form-urlencoded"
                                                    }
                                })

                    const response = await request.json();
                    return response;

    }catch(error){
             console.log("Error", error)
             throw error;
    }
}

async function isoBuyNormal(symbol, quantity, apiKey, apiSecret){
    try{
         const timestamp= Date.now();
       const endpoint = "https://api.binance.com/sapi/v1/margin/order";
             const params ={
                                    symbol,
                                    isIsolated : "TRUE",
                                    side : "BUY",
                                    type : "MARKET",/*MARKET*/
                                    /*quoteOrderQty,*/
                                    quantity: quantity,
                                    /*price : 40000,*/
                                    newOrderRespType:"FULL",
                                    sideEffectType : "NO_SIDE_EFFECT",
                                    /*timeInForce : "GTC", *//* mandatory for limit orders */
                                    timestamp
                            };
            //console.log(params);

             let queryString = Object.keys(params).map(key=> `${key}=${encodeURIComponent(params[key])}`).join("&");

                    const signature = crypto.createHmac("sha256", apiSecret)
                    .update(queryString)
                    .digest("hex");

                    queryString+="&signature="+signature;

                    const url = endpoint + "?" + queryString;
                    const request = await  fetch(url, {
                                    method:"POST",
                                    headers:{
                                                        "X-MBX-APIKEY": apiKey,
                                                        "Content-Type": "application/x-www-form-urlencoded"
                                                    }
                                })

                    const response = await request.json();
                    return response;

    }catch(error){
             console.log("Error", error)
             throw error;
    }
}

/* create a stopSell */
async function stopSell(symbol,  action, quantity, stopPrice, price, apiKey, apiSecret){
        try{
                    const endpoint = "https://api.binance.com/sapi/v1/margin/order";
                    const timestamp= Date.now();
                    const params ={
                                    symbol,
                                    isIsolated: "TRUE",
                                    side : "SELL", //SELL
                                    type : "STOP_LOSS_LIMIT",
                                    quantity,
                                    stopPrice,
                                    price,
                                    sideEffectType : "AUTO_BORROW_REPAY",
                                    timeInForce : "GTC",
                                    timestamp
                                };
                    //console.log(params);

                    let queryString = Object.keys(params).map(key=> `${key}=${encodeURIComponent(params[key])}`).join("&");

                    const signature = crypto.createHmac("sha256", apiSecret)
                    .update(queryString)
                    .digest("hex");

                    queryString+="&signature="+signature;

                    const url = endpoint + "?" + queryString;
                    const request = await  fetch(url, {
                                    method:"POST",
                                    headers:{
                                                        "X-MBX-APIKEY": apiKey,
                                                        "Content-Type": "application/x-www-form-urlencoded"
                                                    }
                                })

                    const response = await request.json();
                    //console.log("response from stop loss order");
                    //console.log(response);
                    return response;
                }catch(error){
                            console.log("Error", error)
                            throw error;
                }
}

async function stopBuy (symbol,  action, quantity, stopPrice, price, apiKey, apiSecret){
        try{
                    const endpoint = "https://api.binance.com/sapi/v1/margin/order";
                    const timestamp= Date.now();
                    const params ={
                                    symbol,
                                    isIsolated: "TRUE",
                                    side : "BUY", //SELL
                                    type : "STOP_LOSS_LIMIT",
                                    quantity,
                                    stopPrice,
                                    price,
                                    sideEffectType : "AUTO_BORROW_REPAY",
                                    timeInForce : "GTC",
                                    timestamp
                                };
                    //console.log(params);

                    let queryString = Object.keys(params).map(key=> `${key}=${encodeURIComponent(params[key])}`).join("&");

                    const signature = crypto.createHmac("sha256", apiSecret)
                    .update(queryString)
                    .digest("hex");

                    queryString+="&signature="+signature;

                    const url = endpoint + "?" + queryString;
                    const request = await  fetch(url, {
                                    method:"POST",
                                    headers:{
                                                        "X-MBX-APIKEY": apiKey,
                                                        "Content-Type": "application/x-www-form-urlencoded"
                                                    }
                                })

                    const response = await request.json();
                    //console.log("response from stop loss order");
                    //console.log(response);
                    return response;
                }catch(error){
                            console.log("Error", error)
                            //throw error;
                            return { "error": error}
                }
}

async function isoShort(symbol, quantity, apiKey, apiSecret){
    try{
         const timestamp= Date.now();
       const endpoint = "https://api.binance.com/sapi/v1/margin/order";
             const params ={
                                    symbol,
                                    isIsolated : "TRUE",
                                    side : "SELL",
                                    type : "MARKET",/*MARKET*/
                                    /*quoteOrderQty,*/
                                    quantity: quantity,
                                    /*price : 40000,*/
                                    newOrderRespType:"FULL",
                                    sideEffectType : "AUTO_BORROW_REPAY",
                                    /*timeInForce : "GTC", *//* mandatory for limit orders */
                                    timestamp
                            };
            //console.log(params);

             let queryString = Object.keys(params).map(key=> `${key}=${encodeURIComponent(params[key])}`).join("&");

                    const signature = crypto.createHmac("sha256", apiSecret)
                    .update(queryString)
                    .digest("hex");

                    queryString+="&signature="+signature;

                    const url = endpoint + "?" + queryString;
                    const request = await  fetch(url, {
                                    method:"POST",
                                    headers:{
                                                        "X-MBX-APIKEY": apiKey,
                                                        "Content-Type": "application/x-www-form-urlencoded"
                                                    }
                                })

                    const response = await request.json();
                    return response;

    }catch(error){
             console.log("Error", error)
             throw error;
    }
}

async function cancelOrders(symbol, apiKey, apiSecret){
        try{
                    const timestamp = Date.now();
                    const endpoint  = "https://api.binance.com/sapi/v1/margin/openOrders";
                    const params    = {
                        symbol,
                        isIsolated : "TRUE",
                        timestamp
                    };

                    let queryString = Object.keys(params).map(key=> `${key}=${encodeURIComponent(params[key])}`).join("&");

                    const signature = crypto.createHmac("sha256", apiSecret)
                    .update(queryString)
                    .digest("hex");

                    queryString+="&signature="+signature;

                    const url = endpoint + "?" + queryString;
                    const request = await fetch(url, {
                                    method:"DELETE",
                                    headers:{
                                                        "X-MBX-APIKEY": apiKey,
                                                        "Content-Type": "application/x-www-form-urlencoded"
                                                    }
                                })


                    const response = await request.json();
                    //console.log("response from cancelling open orders");
                    //console.log(response);
                    return response;

                }catch(error){
                            console.log("error", error);
                            throw error ;
                        }
}
/*
module.exports.getIsoDebt       = getIsoDebt;
module.exports.isoBuy           = isoBuy;
module.exports.isoBuyNormal     = isoBuyNormal;
module.exports.stopSell         = stopSell;
module.exports.cancelOrders     = cancelOrders;
module.exports.isoShort         = isoShort;
module.exports.stopBuy          = stopBuy;
*/

export { getIsoDebt, isoBuy, isoBuyNormal, stopSell, cancelOrders, isoShort, stopBuy };

