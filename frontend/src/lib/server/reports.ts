import type {MemberView,Payment,CheckIn,Activity,User} from '../types';
export declare function analytics():{total:number;annual:number;monthly:number;count:number;trend:{month:string;annual:number;monthly:number}[]};
export declare function activities():{records:Activity[];daily:{total:number;staffLogins:number;payments:number;memberEdits:number};actors:Pick<User,'id'|'name'>[];types:string[]};
export declare function dashboard():{members:number;eligible:number;checkIns:number;denied:number;alerts:MemberView[];alertsCount:number;recent:CheckIn[];payments:Payment[];demo:boolean;visits:{date:string;count:number}[];revenueToday?:number;analytics?:ReturnType<typeof analytics>};


