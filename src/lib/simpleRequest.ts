import makeTorRequest from "./makeTorRequest";
import makeRequest from "./makeRequest";
import { IncomingHttpHeaders } from "http";

interface SimpleOptions {
    tor?: boolean
    method: string
    data?: string 
    url: string
    async?: boolean
}

export interface SimpleResponse {
    headers: Map<string, string> | null
    statusCode: number
    body: string | null
    origin: string 
}

const simpleRequest = (request: SimpleOptions): Promise<SimpleResponse> => {
    if (!request.url) return Promise.resolve({statusCode: 404, body: null, headers: null, origin: request.url});
    if (request.tor) {
        if (request.data) console.error('Not supported yet.');
        if (request.method !== 'GET') {
            console.error('Not supported yet.');
            return Promise.resolve({statusCode: -1, headers: null, body: 'Not supported yet', origin: request.url});
        }
        return makeTorRequest(request.method, request.url)
    } else {
        if (request.data) return makeRequest(request.method, request.url, request.data)
        return makeRequest(request.method, request.url);
    }
};

export default simpleRequest;
