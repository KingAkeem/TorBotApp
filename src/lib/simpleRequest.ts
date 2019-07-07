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

const notSupported = (request :SimpleOptions): boolean => {
    if (request.tor) {
        if (request.data ||request.method !== 'GET') {
            console.error('Not supported');
            return true;
        }
    }
    return false;
}

const invalidUrlResp = (request: SimpleOptions): Promise<SimpleResponse> => {
    return Promise.resolve({statusCode: 404, body: null, headers: null, origin: request.url});
};

const notSupportedResp = (request: SimpleOptions): Promise<SimpleResponse> => {
    return Promise.resolve({statusCode: -1, headers: null, body: 'Unsupported', origin: request.url});
};

const simpleRequest = (request: SimpleOptions): Promise<SimpleResponse> => {
    if (!request.url) return invalidUrlResp(request);
    if (notSupported(request)) return notSupportedResp(request);
    if (request.tor) return makeTorRequest(request.method, request.url);
    if (request.data) return makeRequest(request.method, request.url, request.data);
    return makeRequest(request.method, request.url);
};

export default simpleRequest;
