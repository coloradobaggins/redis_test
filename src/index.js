const express = require('express');
const axios = require('axios');
const responseTime = require('response-time');
const redis = require('redis');

/*
//Connect to redis
const client = redis.createClient({
    host: '127.0.0.1',  //Localhost
    port: 6379          //Default redis port
});
*/

let redisClient;

(async () => {

    redisClient = redis.createClient();
    redisClient.on('error', (err) => console.error(`Error: ${err}`));

    await redisClient.connect();
    console.log(`Connected to redis`);
})();

const PORT = 3000;
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(responseTime());

app.get('/character', async(req, res)=>{

    let results;
    let cached = false;
    let statusCode = 200;

    try{

        //Check si no lo tengo guardado antes, lo busco.
        const cachedResults = await redisClient.get('character');
        if(cachedResults){
            console.log(`*** cached results ***`);
            cached = true;
            //let parsedCachedResults = JSON.parse(cachedResults);
            //console.log(parsedCachedResults);
            //return res.json(parsedCachedResults);
            results = JSON.parse(cachedResults);
        }else{


            console.log(`*** NO-cached results ***`);

            const rawData = await axios.get(`https://rickandmortyapi.com/api/character`);

            results = rawData.data;
            await redisClient.set('character', JSON.stringify(results));

        }

    }catch(err){
        console.log(err);
        console.log(err.response.status);
        statusCode = err.response.status;
        results = err.response.statusText;
    }
      

    //console.log(rawData.data);
    res.status(statusCode).json({
        statusCode: statusCode,
        cached,
        results
    });

});

app.get('/character/:id', async(req, res)=>{

    let { id } = req.params;
    let results;
    let cached = false;
    let statusCode = 200;
    
    try{

        let cachedResults = await redisClient.get(id);

        if(cachedResults){

            cached = true;
            console.log(`*** cached results ..character:id ***`);
            results = JSON.parse(cachedResults);

        }else{

            let rawData = await axios.get(`https://rickandmortyapi.com/api/character/${id}`);
            results = rawData.data;

            await redisClient.set(id, JSON.stringify(results));

            console.log(rawData.data);

        }

    }catch(err){
        //console.log(err);
        console.log(err.response.status);
        statusCode = err.response.status;
        results = err.response.statusText;
    }


    res.status(statusCode).json({
        statusCode:statusCode,
        cached: cached,
        results
    });

});

const listen = app.listen(PORT, ()=> console.log(`listening on port ${listen.address().port}`));
