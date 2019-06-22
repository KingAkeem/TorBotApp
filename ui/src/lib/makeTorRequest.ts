import tr from 'tor-request';

export default function(url: string): Promise<any> {
    return new Promise((accept, reject) => {
        tr.request(url, (error: any, response: any, _) => {
            if (error) reject(error);
            accept(response);
        });
    });
}