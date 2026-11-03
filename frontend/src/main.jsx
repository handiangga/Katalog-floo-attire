import React from 'react';
import {createRoot} from 'react-dom/client';
import {BrowserRouter,Routes,Route} from 'react-router-dom';
import Header from './components/Header';
import Catalog from './pages/Catalog';
import Detail from './pages/Detail';
import About from './pages/About';
import Rules from './pages/Rules';
import Admin from './pages/Admin';
import AdminLogin from './pages/AdminLogin';
import './styles.css';
import './v2.css';
function App(){return <BrowserRouter><Header/><Routes><Route path="/" element={<Catalog/>}/><Route path="/katalog" element={<Catalog/>}/><Route path="/produk/:slug" element={<Detail/>}/><Route path="/about" element={<About/>}/><Route path="/rules" element={<Rules/>}/><Route path="/admin/login" element={<AdminLogin/>}/><Route path="/admin" element={<Admin/>}/><Route path="*" element={<Catalog/>}/></Routes><footer className="site-footer">© {new Date().getFullYear()} Floo Attire <span>·</span> Kebaya Rental</footer></BrowserRouter>}
createRoot(document.getElementById('root')).render(<React.StrictMode><App/></React.StrictMode>);
