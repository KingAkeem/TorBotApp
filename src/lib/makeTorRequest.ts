import tr from 'tor-request';
import { IncomingMessage } from 'http';
import { SimpleResponse } from './simpleRequest';

const getHeaderMap = (headers: {[header: string]: string | string[] | undefined}): Map<string, string> => {
    const headerMap = new Map();
    for (let header in headers) {
        headerMap.set(header, headers[header]);
    }
    return headerMap;
};
const makeTorRequest = (method: string, url: string): Promise<SimpleResponse> => {
    return new Promise((accept, reject) => {
        const getHandler = (error: any, response: IncomingMessage, body: string) => {
            if (error) reject(error);
            accept({
                origin: url,
                headers: getHeaderMap(response.headers),
                body: body,
                statusCode: response.statusCode
            });
        };
        if (method === 'GET') {
            tr.request(url,getHandler);
        }
    });
}
export default makeTorRequest;