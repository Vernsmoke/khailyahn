import type {AnchorHTMLAttributes} from 'react';
export default function Link({prefetch, ...props}: AnchorHTMLAttributes<HTMLAnchorElement> & {prefetch?: boolean}) {return <a {...props}/>;}

