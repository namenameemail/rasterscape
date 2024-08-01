import * as React from "react";
import {useRef, useEffect, useMemo} from "react";
import {imageDataToCanvas} from "utils/canvas/helpers/imageData";
import '../../../styles/canvasImageData.scss';
import _throttle from 'lodash/throttle';
import {WithTranslation, withTranslation, WithTranslationProps} from "react-i18next";

export interface WebWorkerCanvasProps  {
    throttled?: boolean
    width: number
    height: number
    params?: any
    imageData?: ImageData
    [x: string]: any
}

export const webWorkerCanvas = <ParamsType extends any>(workerPath: string): React.ComponentType<WebWorkerCanvasProps> => {

    const WebWorkerCanvas: React.FC<WebWorkerCanvasProps> = ({ throttled, width, height, params, imageData, ...otherProps}) => {


        const canvasRef = useRef(null);

        const [_error, setError] = React.useState(null);

        const messageHandler = React.useCallback((ev: MessageEvent) => {
            const {imageData, error, log} = ev.data;

            log && console.log(log);

            if (error !== _error) {
                setError(error);
            }

            if (error) return;

            if (!imageData) return

            const canvas = canvasRef?.current;
            const context = canvas?.getContext("2d");

            context?.clearRect(0, 0, width, height);

            context?.drawImage(imageDataToCanvas(imageData), 0, 0, width, height);
        }, [_error]);

        const worker = useMemo(() => {
            const worker = new Worker(workerPath);
            worker.onmessage = messageHandler;

            return worker;
        }, []);

        const post = React.useMemo(() => {
            const post = (canvasRef, width, height, params, otherProps, imageData, worker) => {

                try {
                    // coordHelper2.setText(+new Date() + ' po');
                    const canvas = canvasRef.current;

                    const context = canvas?.getContext("2d");

                    worker.postMessage({
                        imageData: imageData || context?.getImageData(0, 0, width, height) || null,
                        params: {
                            ...otherProps,
                            ...params
                        },
                        width, height
                    });
                } catch (e) {
                    console.log(22222);
                }
            };
            return !throttled ? _throttle(post, 100) : post;
        }, [throttled]);


        useEffect(() => {
            // coordHelper3.setText(+new Date() + ' ef');
            post(canvasRef, width, height, params, otherProps, imageData, worker);
        }, [params, width, height, throttled, imageData]);

        return !_error ? (
            <canvas
                className={"canvas-image-data"}
                width={width}
                height={height}
                ref={canvasRef}/>
        ) : (
            <div className={'canvas-image-data canvas-image-data-error'}>{(_error)}</div>
        );
    };
    return WebWorkerCanvas;
};

export const Paraboloid = webWorkerCanvas('./workers/paraboloid.js');
export const ChannelImageData = webWorkerCanvas('./workers/channels.js');
export const Saw = webWorkerCanvas('./workers/saw.js');
export const Sin = webWorkerCanvas('./workers/sin.js');
export const Sis2 = webWorkerCanvas('./workers/sis2.js');
export const Noise = webWorkerCanvas('./workers/noise.js');
export const Sq = webWorkerCanvas('./workers/sq.js');
