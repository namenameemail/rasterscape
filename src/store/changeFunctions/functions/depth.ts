

export interface CfDepthParams {
    items: {
        id: number
        patternId: string,
        zed: number,
        zd: number,
        component: number
    }[]
}

export const depthInitialParams = {
    items: [],
};

export const depthNumberChangeFunction =
    ({params, range, pattern}) =>
        ({startValue, time, position}) => {

            return startValue;

            const {items} = params;


            const f = (x, y) => {
                return items?.reduce((res, item) => {
                    const {patternId, zed, zd, component} = item;
                    const imageData = pattern.current.imageData;

                    const xnorm = Math.round(x / pattern.current.imageData.width * (imageData.width || 0));
                    const ynorm = Math.round(y / pattern.current.imageData.height * (imageData.height || 0));

                    return res + imageData.data[(xnorm + ynorm * imageData.width) * 4 + component] / 255 * zed + zd;
                }, 0) || 0;

            };

            const width = pattern.current.imageData.width;
            const height = pattern.current.height;

            const xnorm = position.x / width;
            const ynorm = position.y / height;
            const znorm = f(xnorm, ynorm);

            // (range[1] - startValue) * end;

            // return Math.max(
            //     Math.min(
            //         (znorm * end) * (range[1] - range[0]) + startValue,
            //         startValue + (range[1] - startValue) * end
            //     ),
            //     startValue
            // );
        };

// export const depthVideoChangeFunction =
//     (x, y, patternWidth, patternHeight, params, patterns) => {

//         const {items} = params;


//         const f = (x, y) => {
//             return items?.reduce((res, item) => {
//                 const {patternId, zed, zd, component} = item;

//                 const pattern = patterns[patternId];

//                 if (!pattern) return res;

//                 const imageData = pattern.current.imageData;

//                 const xnorm = Math.round(x / patternWidth * (imageData.width || 0));
//                 const ynorm = Math.round(y / patternHeight * (imageData.height || 0));

//                 return res + imageData.data[(xnorm + ynorm * imageData.width) * 4 + component] / 255 * zed + zd;
//             }, 0) || 0;

//         };


//         const znorm = f(x, y);

//         return znorm;// * patternWidth;
//     };
