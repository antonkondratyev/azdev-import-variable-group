import os = require('os');
import tl = require('vsts-task-lib/task');
import vsts = require('vso-node-api/WebApi');
import { IRequestHandler } from 'vso-node-api/interfaces/common/VsoBaseInterfaces';
import { ITaskAgentApi } from 'vso-node-api/TaskAgentApi';
import { VariableGroup } from 'vso-node-api/interfaces/TaskAgentInterfaces';

tl.setResourcePath(tl.resolve(__dirname, 'task.json'));

let variableGroup: number = Number(tl.getInput('variableGroup', true));
let prefix: string = tl.getInput('prefix', false);
let traceImportedVariables: boolean = tl.getBoolInput('traceImportedVariables', false);

let collectionUri: string = tl.getVariable('system.teamFoundationCollectionUri');
let teamProject: string = tl.getVariable('system.teamProject');
let connection: vsts.WebApi = getConnection(collectionUri);
let taskAgent: ITaskAgentApi = connection.getTaskAgentApi();

async function main() {
    try {
        let varGroup: VariableGroup = await taskAgent.getVariableGroup(teamProject, variableGroup);
        let vars = varGroup.variables;
        let importedVars: string = '';

        Object.keys(vars)
            .filter(key => !vars[key].isSecret)
            .forEach(key => {
                let varName: string;
                let varValue: string = vars[key].value;

                if (prefix === null) {
                    varName = key;
                } else {
                    varName = prefix.replace('$(VariableGroupName)', varGroup.name) + key;
                }

                let getBuildVar: string = tl.getVariable(varName);
                if (getBuildVar !== undefined) {
                    console.log(`Variable "${varName}" is override of "${getBuildVar}" on "${varValue}"`);
                }

                tl.setVariable(varName, varValue);

                importedVars += `$(${varName}) = ${varValue}` + os.EOL;
            });
        
        if (traceImportedVariables) console.log(importedVars);
    } catch (err) {
        tl.setResult(tl.TaskResult.Failed, err.message);
    }
}

function getConnection(collectionUri: string): vsts.WebApi {
    let webApi = (url: string, authHandler: IRequestHandler) => new vsts.WebApi(url, authHandler);
    let authType: string = tl.getInput('auth', true);
    
    switch (authType) {
        case 'vssToken':
            let vssToken: string = tl.getEndpointAuthorizationParameter('SystemVssConnection', 'AccessToken', false);
            return webApi(collectionUri, vsts.getHandlerFromToken(vssToken));
        
        case 'oAuth':
            let oAuthToken: string = tl.getVariable('system.accessToken');
            return webApi(collectionUri, vsts.getHandlerFromToken(oAuthToken));
        
        case 'serviceEndpoint':
            let endpointName: string = tl.getInput('connectedServiceName', true);
            let endpointUrl: string = tl.getEndpointUrl(endpointName, false);
            let endpointAuth: tl.EndpointAuthorization = tl.getEndpointAuthorization(endpointName, false);
            let endpointUsername: string = endpointAuth.parameters['username'];
            let endpointPassword: string = endpointAuth.parameters['password'];
            
            if (endpointPassword.length === 52) {
                return webApi(endpointUrl, vsts.getPersonalAccessTokenHandler(endpointPassword));
            } else {
                return webApi(endpointUrl, vsts.getBasicHandler(endpointUsername, endpointPassword));
            }
        
        case 'basic':
            let basicUsername: string = tl.getInput('username', true);
            let basicPassword: string = tl.getInput('password', true);
            return webApi(collectionUri, vsts.getBasicHandler(basicUsername, basicPassword));
        
        default:
            tl.setResult(tl.TaskResult.Failed, 'Authentication method not selected.');
            break;
    }
}

main();