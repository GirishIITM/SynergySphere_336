import { useState } from 'react';
import { Link } from 'react-router-dom';
import './Register.css';
import { Button } from './ui/button';
import { Input } from './ui/input';

const Register = () => {
  const [formData, setFormData] = useState({
    firstname: '',
    lastname: '',
    email: '',
    password: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Handle registration logic here - you can add API calls
    console.log('Form submitted:', formData);
  };

  return (
    <div className="register-container">
      <h1 className="register-title">Create an account</h1>
      <form className="register-form" onSubmit={handleSubmit}>
        <div>
          <label htmlFor="register-firstname">First Name:</label>
          <Input
            type="text" 
            id="register-firstname" 
            name="firstname" 
            value={formData.firstname}
            onChange={handleChange}
            required 
          />
        </div>
        <div>
          <label htmlFor="register-lastname">Last Name:</label>
          <Input
            type="text" 
            id="register-lastname" 
            name="lastname" 
            value={formData.lastname}
            onChange={handleChange}
            required 
          />
        </div>
        <div>
          <label htmlFor="register-email">Email:</label>
          <Input
            type="email" 
            id="register-email" 
            name="email" 
            value={formData.email}
            onChange={handleChange}
            required 
          />
        </div>
        <div>
          <label htmlFor="register-password">Password:</label>
          <Input
            type="password" 
            id="register-password" 
            name="password" 
            value={formData.password}
            onChange={handleChange}
            required 
          />
        </div>
        <Button 
          type="submit"
          className="w-full"
          size="lg"
        >
          Create an account
        </Button>
      </form>
      <p className="register-link-text text-center mt-4 text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link to="/login" id="login-link" className="text-primary hover:text-primary/80 font-medium">
          Login
        </Link>
      </p>
    </div>
  );
};

export default Register;
