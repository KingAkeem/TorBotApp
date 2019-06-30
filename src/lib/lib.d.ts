type requestCallback = (error: Error, res: any, body: any) => void;

declare class tr {
    static request(input: string | any, cb: requestCallback): void; 
}

declare module "tor-request" {
    export default tr; 
}