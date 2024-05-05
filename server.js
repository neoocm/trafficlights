const express = require('express');
const https = require('http');
const readline = require('readline');
const uuid = require('uuid');
const P = require('./persistence.js');

const PORT = 9000;
const PROPOSAL_TIMEOUT = 100000;
const PROPOSAL_TRIES_MAX = 3;
const PROPOSAL_TRIES_TIMEOUT = 5000;
const COMMIT_TIMEOUT = 100000;
const COMMIT_TRIES_MAX = 3;
const COMMIT_TRIES_TIMEOUT = 5000;

let trafficLightsData = {};

class Proposal {
    constructor(id, trafficLight, startingTime, baseTimes, configTimes, states) {
        this.id = id;
        this.baseTimes = baseTimes;
        this.configTimes = configTimes;
        this.startingTime = startingTime;
        this.trafficLight = trafficLight;
        this.states = states;
    }
}

function startHeartbeatListen(){

    const app = express();
    app.use(express.json());
    
    app.post('/heartbeat', (req, res) => {
        //parse the raw body of the request
        let data = req.body;
        if (!data) {
            res.status(400).send('No data received');
            return;
        }
        //console.log(data);
        data.lastHeartbeat = new Date();
        data.ip = req.ip;
        trafficLightsData[data.id] = data;
        let numberTrafficLights = Object.keys(trafficLightsData).length;
        console.log('Number of trafficLights',numberTrafficLights);
        //console.log(trafficLightsData);
        res.send('OK');
    });
    
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}

function displayTrafficLights()
{
    setInterval(() => {
        console.log('Traffic Light Data:');
        console.log(trafficLightsData);
    }, 5000);
}

function waitForEntry(){

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    
    rl.on('line', (input) => {
        console.log(`Received input: ${input}`);
        var proposalId = uuid.v4();
        var proposalData = P.read(input);
        if(proposalData === null)
        {
            console.error(`File ${input}.json not found`);
            var trafficLights = Object.values(trafficLightsData);
            var proposals = trafficLights.map(trafficLight => new Proposal(proposalId, trafficLight, 0, [1000,500,1000], null, null));
        }
        else
        {
            var keys = Object.keys(proposalData);
            var trafficLights = Object.values(trafficLightsData).filter(trafficLight => keys.includes(trafficLight.id));
            var proposals = trafficLights.map(trafficLight => new Proposal(proposalId, trafficLight, proposalData[trafficLight.id].startingTime, proposalData[trafficLight.id].baseTimes, proposalData[trafficLight.id].configTimes, proposalData[trafficLight.id].states));
        }

        initiateProposal(proposals);
            
    });
}


function initiateProposal(proposals) {

    const promises = proposals.map(proposal => retrySendProposal(proposal));

    Promise.race([
        Promise.all(promises)
    ,   new Promise((resolve, reject) => {
            setTimeout(() => {
                reject(new Error('Proposal timeout exceeded'));
            }, PROPOSAL_TIMEOUT);
        })
    ]).then(() => {
        console.log(`All traffic lights accepted proposal ${proposals[0].id} !!!`);
        initiateCommit(proposals);
    }).catch(error => {
        console.error(`Error occurred while sending proposal ${proposals[0].id} :`, error);
    });
}

function retrySendProposal(proposal)
{
    return new Promise((resolve, reject) => {

        let retries = 0;

        function sendProposalRetry() {

            sendProposal(proposal).then(() => {
                resolve();
            }).catch(error => {
                console.error(`Error occurred while sending proposal to traffic light ${proposal.trafficLight.id}:`, error, 'retrying...');
                if (retries < PROPOSAL_TRIES_MAX) {
                    retries++;
                    setTimeout(sendProposalRetry, PROPOSAL_TRIES_TIMEOUT);
                }
                else {
                    reject(new Error(`Max retries reached for traffic light ${proposal.trafficLight.id}`));
                }
            });
        }
        sendProposalRetry();
    });
}

function sendProposal(proposal) {
    
    return new Promise((resolve, reject) => {
        
        let data = {
            proposalId: proposal.id
        ,   id: proposal.trafficLight.id
        ,   baseTimes: proposal.baseTimes
        ,   configTimes: proposal.configTimes
        ,   startingTime: proposal.startingTime
        ,   states: proposal.states
        };
        let postData = JSON.stringify(data);
        
        const options = {
            hostname: proposal.trafficLight.ip,
            port: proposal.trafficLight.port,
            path: '/propose',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            ,	'Content-Length': Buffer.byteLength(postData)
            }     
        };

        console.log(`Sending proposal to traffic light ${proposal.trafficLight.id}`);
        const request = https.request(options, response => {

            if (response.statusCode !== 200){
                reject(new Error(`Proposal rejected by traffic light ${proposal.trafficLight.id}`));
            }

            let data = '';
            response.on('data', (chunk) => {
                data += chunk;
            });
        
            response.on('end', () => {
                console.log(`Traffic light ${proposal.trafficLight.id} responded to proposal ${data} `);
                resolve();
            });
        });

        request.write(postData);

        request.on('error', error => {
            reject(error);
        });

        request.end();
    });
}

function initiateCommit(proposals) {

    const promises = proposals.map(proposal => retrySendCommit(proposal));

    Promise.race([
        Promise.all(promises)
    ,   new Promise((resolve, reject) => {
            setTimeout(() => {
                reject(new Error('Commit timeout exceeded'));
            }, COMMIT_TIMEOUT);
        })
    ]).then(() => {
        console.log(`All traffic lights committed to proposal ${proposals[0].id} !!!`);
    }).catch(error => {
        console.error(`Error occurred while committing to proposal ${proposals[0].id}:`, error);
    });
}

function retrySendCommit(proposal)
{
    return new Promise((resolve, reject) => {

        let retries = 0;

        function sendCommitRetry() {

            sendCommit(proposal).then(() => {
                resolve();
            }).catch(error => {
                console.error(`Error occurred while sending commit to traffic light ${proposal.trafficLight.id}:`, error, 'retrying...');
                if (retries < COMMIT_TRIES_MAX) {
                    retries++;
                    setTimeout(sendCommitRetry, COMMIT_TRIES_TIMEOUT);
                }
                else {
                    reject(new Error(`Max retries reached for traffic light ${proposal.trafficLight.id}`));
                }
            });
        }
        sendCommitRetry();
    });
}

function sendCommit(proposal) {

    return new Promise((resolve, reject) => {

        let data = {
            proposalId: proposal.id
        ,   id: proposal.trafficLight.id
        ,   baseTimes: proposal.baseTimes
        ,   configTimes: proposal.configTimes
        ,   startingTime: proposal.startingTime
        ,   states: proposal.states
        };
        let postData = JSON.stringify(data);

        const options = {
            hostname: proposal.trafficLight.hostname,
            port: proposal.trafficLight.port,
            path: '/commit',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            ,	'Content-Length': Buffer.byteLength(postData)
            }   
        };

        const request = https.request(options, response => {
            
            if (response.statusCode !== 200){
                reject(new Error(`Commit rejected by traffic light ${proposal.trafficLight.id}`));
            }

            let data = '';
            response.on('data', (chunk) => {
                data += chunk;
            });
        
            response.on('end', () => {
                console.log(`Traffic light ${proposal.trafficLight.id} responded to commit ${data} `);
                resolve();
            });

        });

        request.write(postData);

        request.on('error', error => {
            reject(error);
        });
        request.end();
    });
}

(function main() {
    startHeartbeatListen();
    //displayTrafficLights();
    waitForEntry();
})();