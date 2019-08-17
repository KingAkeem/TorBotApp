import makeTorRequest from "./makeTorRequest";
import makeRequest from "./makeRequest";

interface Options {
    tor?: boolean
    data?: string 
    url: string
    async?: boolean
}

export interface Response {
    headers: Map<string, string> | null
    statusCode: number
    body: string | null
    origin: string 
}

export default class Request {
    constructor() {}

    async get(opts: Options): Promise<Response> {
        if (opts.tor) return makeTorRequest('GET', opts.url);
        return makeRequest('GET', opts.url);
    }

    async post(opts: Options): Promise<Response> {
        if (opts.data) return makeRequest('POST', opts.url, opts.data);
    }
}