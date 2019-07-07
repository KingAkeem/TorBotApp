import tr from 'tor-request';
import { IncomingMessage } from 'http';
import { SimpleResponse } from './simpleRequest';

type Headers = {[header: string]: string | string[] | undefined};
const getHeaderMap = (headers: Headers): Map<string, string> => {
    const headerMap = new Map();
    for (let header in headers) {
        headerMap.set(header, headers[header]);
    }
    return headerMap;
};
const makeTorRequest = (method: string, origin: string): Promise<SimpleResponse> => {
    return new Promise((accept, reject) => {
        const getHandler = (error: any, response: IncomingMessage, body: string) => {
            if (error) reject(error);
            const headers = getHeaderMap(response.headers);
            const statusCode = response.statusCode;
            accept({ origin, headers, body, statusCode });
        };
        if (method === 'GET') {
            tr.request(origin, getHandler);
        }
    });
}
export default makeTorRequest;