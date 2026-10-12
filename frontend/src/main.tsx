import {createRoot} from 'react-dom/client';
import {Component, useEffect, useState, type ReactNode} from 'react';
import {GymApp} from '@/components/layout/gym-app';
import {LoginForm} from '@/components/auth/login';
import {ThemeProvider} from '@/components/providers/theme';
import {BrandingProvider} from '@/components/providers/branding-provider';
import {FormFeedback} from '@/components/ui/form-feedback';
import type {User} from '@/lib/types';
import '@/styles/globals.css';
import '@/styles/mobbin.css';
import '@/styles/intercom.css';
import '@/styles/font.css';
class Boundary extends Component<{children:ReactNode},{failed:boolean}> {
state={failed:false}; static getDerivedStateFromError(){return {failed:true};}
render(){return this.state.failed?<main><h1>Unable to display this page</h1><p>Please reload the page. If this continues, contact your administrator.</p><a href="/dashboard">Reload dashboard</a></main>:this.props.children;}
}
function App(){
const [state,setState]=useState<{user:User|null;version:string}|null>(null);
const [error,setError]=useState('');
useEffect(()=>{fetch('/api/bootstrap',{cache:'no-store'}).then(async r=>{const data=await r.json();if(!r.ok)throw new Error(data.error||'Unable to connect');setState(data);}).catch(e=>setError(e.message));},[]);
if(error)return <main role="alert"><h1>Unable to connect</h1><p>{error}</p><button onClick={()=>location.reload()}>Retry</button></main>;
if(!state)return <main aria-busy="true">Loading gym workspace…</main>;
const section=location.pathname.split('/').filter(Boolean)[0]||'dashboard';
if(!state.user&&section!=='login'){location.replace('/login');return null;}
if(state.user&&section==='login'){location.replace('/dashboard');return null;}
const valid=['dashboard','members','register','renewals','payments','scan','check-ins','analytics','activities','staff','settings','login'];
return <BrandingProvider initialVersion={state.version}><ThemeProvider initialTheme={document.cookie.includes('gym-theme=dark')?'dark':'light'}>
{!valid.includes(section)?<main><h1>Page not found</h1><a href="/dashboard">Go to dashboard</a></main>:state.user?<GymApp user={state.user} section={section} forbidden={state.user.role!=='ADMIN'&&['analytics','activities','staff','settings'].includes(section)} initialCollapsed={!document.cookie.includes('gym-sidebar=expanded')}/>:<LoginForm/>}
<FormFeedback/></ThemeProvider></BrandingProvider>;
}
createRoot(document.getElementById('root')!).render(<Boundary><App/></Boundary>);


