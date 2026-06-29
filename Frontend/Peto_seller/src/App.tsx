import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom'; 
import Login from './auth/login'; 
import Signup from "./auth/signup";
import Forgot_password from './auth/forgot_password';
import './App.css'


export default function App(){
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/seller/login" />} />
        <Route path="/seller/login" element={<Login />} />
        <Route path="/seller/signup" element={<Signup />} />
        <Route path="/seller/forgot-password" element={<Forgot_password />} />
      </Routes>
    </Router>
  );
}
