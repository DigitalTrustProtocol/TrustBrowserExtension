import hashicon = require('hashicon');

class Identicon {
    public static createIcon(data: string, param: any = 64) : string {
        
        let canvas = (<any>hashicon)(data, param) as HTMLCanvasElement;
        return canvas.toDataURL("image/png");
    }
}

export = Identicon