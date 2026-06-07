export class CursorHelper {
    setPos;
    constructor(color, size) {
        const elem = document.createElement('div');
        document.body.appendChild(elem);

        this.setPos = (x, y) => {
            elem.style.cssText = `position:absolute;top:${y - size/2}px;left:${x - size/2}px;width:${size}px;height:${size}px;opacity:1;z-index:100;background: ${color}; pointer-events: none;}`;
        };
    }
}

export class TextHelper {
    setText;
    getText;
    write;
    writeln;
    clear;
    readonly elem: HTMLDivElement;
    private constantText: HTMLSpanElement;

    constructor(x, y, text?: string) {
        const elem = document.createElement('div');
        const constantText = document.createElement('span');
        const settableText = document.createElement('span');
        elem.appendChild(settableText);
        elem.appendChild(constantText);

        constantText.innerText = text;
        this.elem = elem;
        this.constantText = constantText;

        document.body.appendChild(elem);

        elem.style.cssText = `position:absolute;bottom:${y}px;right:${x}px;opacity:1;z-index:100;font-family: monospace;}`;

        this.setText = (...string) => {
            settableText.innerText = string.join(' ');
        };
        this.write = (...string) => {
            settableText.innerText = settableText.innerText + ' ' + string.join(' ');
        };
        this.writeln = (...string) => {
            try {
                settableText.innerText = settableText.innerText + ' ' + string.join(' ') + '\n';
            } catch (e) {

            }

        };
        this.clear = () => {
            settableText.innerText = '';
        };
        this.getText = () => {
            return settableText.innerText;
        };
        elem.addEventListener('mouseup', () => {
            this.setText('');
        })
    }

    attachToPanel(parent: HTMLElement): void {
        parent.appendChild(this.elem);
        this.elem.style.cssText = '';
        this.constantText.style.display = 'none';
    }
}


export class ImageDataHelper {
    setImageData;

    constructor(x, y) {
        const elem: HTMLCanvasElement = document.createElement('canvas');
        document.body.appendChild(elem);

        elem.style.cssText = `position:absolute;bottom:${y}px;right:${x}px;opacity:1;z-index:100;font-family: monospace;}`;

        this.setImageData = (imageData: ImageData | null) => {
            if (imageData) {
                elem.width = imageData.width;
                elem.height = imageData.height;
                const ctx = elem.getContext('2d');
                ctx.clearRect(0, 0, elem.width, elem.height);
                ctx.putImageData(imageData, 0, 0);
            } else {
                elem.width = 1;
                elem.height = 1;
                const ctx = elem.getContext('2d');
                ctx.clearRect(0, 0, elem.width, elem.height);
            }
        };
        elem.addEventListener('mouseup', () => {
            this.setImageData(null);
        })
    }
}

export class ImageHelper {
    setImage;

    constructor(x, y) {
        const elem: HTMLCanvasElement = document.createElement('canvas');
        document.body.appendChild(elem);

        elem.style.cssText = `position:absolute;bottom:${y}px;right:${x}px;opacity:1;z-index:100;font-family: monospace;}`;

        this.setImage = (image: HTMLCanvasElement | null) => {
            if (image) {
                elem.width = image.width;
                elem.height = image.height;
                const ctx = elem.getContext('2d');
                ctx.clearRect(0, 0, elem.width, elem.height);
                ctx.drawImage(image, 0, 0);
            } else {
                elem.width = 1;
                elem.height = 1;
                const ctx = elem.getContext('2d');
                ctx.clearRect(0, 0, elem.width, elem.height);
            }
        };
        elem.addEventListener('mouseup', () => {
            this.setImage(null);
        })
    }
}

export const redHelper = new CursorHelper('#f00', 10);
export const blueHelper = new CursorHelper('#00f', 10);
export const greenHelper = new CursorHelper('#0f0', 10);

export const coordHelper = new TextHelper(10, 30, '   1');
export const coordHelper2 = new TextHelper(10, 50, '   2');
export const coordHelper3 = new TextHelper(10, 70, '   3');
export const coordHelper4 = new TextHelper(10, 90, '   4');
export const coordHelper5 = new TextHelper(10, 110, '   5');

export const imageDataDebug = new ImageDataHelper(10, 300);
export const imageDebug = new ImageHelper(10, 400);






// const elem = document.createElement('div');
// document.body.appendChild(elem);
//
// elem.style.cssText = `position:absolute;top:${0}px;left:${0}px;opacity:1;z-index:100;width:${300}px; height:${300}px; border: 1px solid rgba(0,0,0,.3)`;
