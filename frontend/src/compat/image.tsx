import type {ImgHTMLAttributes} from 'react';
export default function Image({unoptimized,quality,priority,preload,fill,style,...props}:ImgHTMLAttributes<HTMLImageElement>&{unoptimized?:boolean;quality?:number;priority?:boolean;preload?:boolean;fill?:boolean}) {
return <img {...props} loading={preload||priority?'eager':props.loading} style={fill?{position:'absolute',inset:0,width:'100%',height:'100%',...style}:style}/>;
}

