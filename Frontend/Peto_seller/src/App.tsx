import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom'; 
import Login from './auth/login'; 
import Signup from "./auth/signup";
import Forgot_password from './auth/forgot_password';
import Dashboard from './Pages/Dashboard';
import Coupen_management from './Pages/Coupen_management';
import Product_management from './Pages/Product_managment';
import './App.css'

import Layout from './components/layout/layout';


export default function App(){
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/seller/login" />} />
        <Route path="/seller/login" element={<Login />} />
        <Route path="/seller/signup" element={<Signup />} />
        <Route path="/seller/forgot-password" element={<Forgot_password />} />
        <Route element={<Layout  />}>
          <Route path="/seller/dashboard" element={<Dashboard />}/>
          <Route path="/seller/coupen-management" element={<Coupen_management />}/>
          <Route path="/seller/product-management" element={<Product_management />}/>
        </Route>
      </Routes>
    </Router>
  );
}
