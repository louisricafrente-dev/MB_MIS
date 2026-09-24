import React, { useState, useEffect } from "react";
import { useNavigate, NavLink, useSearchParams } from "react-router-dom";
import { useAuth } from "@/context/authContext";
import Logo from "@/assets/LOGO.png";
import PopupModal from "@/components/modals/PopupModal";
import bg from "@/assets/Image-1-1.jpg";

const Login = () => {
  const [credentials, setCredentials] = useState({
    username: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [apiError, setApiError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [searchParams] = useSearchParams();
const redirectParam = searchParams.get("redirect");

  const navigate = useNavigate();
  const { user, login, forcedLogoutReason, resetForcedLogoutReason, socketReady } = useAuth(); 

  useEffect(() => {
    if (forcedLogoutReason) {
      setError(forcedLogoutReason);
    }
  }, [forcedLogoutReason]);

useEffect(() => {
  if (user) {
    navigate(redirectParam || "/admin/dashboard", { replace: true });
  }
}, [user, redirectParam]);

  const handleChange = (e) => {
    setCredentials({
      ...credentials,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setApiError("");
    setIsLoading(true);

    const { success, message } = await login(credentials);
    setIsLoading(false);

    if (!success) {
      if (
        message &&
        (message.toLowerCase().includes("password") ||
          message.toLowerCase().includes("username") ||
          message.toLowerCase().includes("email"))
      ) {
        setError(message);
      } else {
        setApiError(message);
      }
    }
  };

  // New handler to close the "You've been logged out" modal and clear the reason
  const handleForcedLogoutModalClose = () => {
    setError("");
    resetForcedLogoutReason(); // Reset the state in the AuthContext
  };

  // New handler to close the API error modal
  const handleApiErrorModalClose = () => {
    setApiError("");
  };

  return (
    <div className="flex flex-col w-screen min-w-fit h-[98.5vh]">
      <NavLink
        className="group flex items-center cursor-pointer font-semibold ml-1 mt-1 w-fit rounded-md px-1 hover:text-gray-500"
        to="/"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          className="stroke-black group-hover:stroke-gray-500"
          strokeWidth="1"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M9 14l-4 -4l4 -4" />
          <path d="M5 10h11a4 4 0 1 1 0 8h-1" />
        </svg>
        <span className="font-semibold">Home</span>
      </NavLink>

      <div className="w-full flex my-auto select-none justify-center">
        <form
          onSubmit={handleSubmit}
          className="px-8 pt-8 pb-6 rounded-lg shadow-md shadow-gray-400 w-full max-w-xl"
        >
          <div className="mb-7 w-full h-fit flex flex-col items-center gap-y-4">
            <div className="flex gap-x-2 items-center">
              <img src={Logo} className="w-15" alt="Museo Bulawan Logo" />
              <i className="w-1 h-12 rounded-4xl bg-gray-500"></i>
              <div className="flex flex-col justify-center">
                <span className="text-2xl font-bold">Museo Bulawan</span>
                <span className="text-xs text-gray-600 font-semibold leading-3">
                  Management Information System
                </span>
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-7xl font-semibold">Welcome back</span>
              <span className="text-2xl text-center text-gray-500">
                Please enter your details to sign in
              </span>
            </div>
          </div>

          <div className="mb-4">
            <label htmlFor="username" className="block text-xl mb-2">
              Your username or email
            </label>
            <input
              id="username"
              type="text"
              name="username"
              placeholder="username or email"
              value={credentials.username}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500"
              required
            />
          </div>

          <div className="mb-4">
            <label htmlFor="password" className="block text-xl mb-2">
              Password
            </label>
            <input
              id="password"
              type="password"
              name="password"
              placeholder="*******"
              value={credentials.password}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500"
              required
            />
          </div>
          <div className="mb-4 w-full flex justify-end">
            <NavLink to="/login/forgot-password">
              <span className="font-semibold text-xl hover:text-gray-600">
                Forgot password
              </span>
            </NavLink>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="cursor-pointer w-full bg-black hover:bg-gray-800 text-white py-2 text-xl font-semibold rounded-lg transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "Logging in..." : "Login"}
          </button>

          <div className="relative my-4 flex items-center justify-center">
            <div className="border-t border-gray-300 w-full" />
            <span className="bg-white px-3 text-xs uppercase text-gray-500 font-semibold tracking-wider absolute">
              Portfolio Live Demo
            </span>
          </div>

          <button
            type="button"
            disabled={isLoading}
            onClick={async () => {
              setIsLoading(true);
              const demoCreds = { username: "admin", password: "password123" };
              setCredentials(demoCreds);
              await login(demoCreds);
              navigate(redirectParam || "/admin/dashboard", { replace: true });
              setIsLoading(false);
            }}
            className="cursor-pointer w-full bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white py-3 text-2xl font-bold rounded-lg shadow-md hover:shadow-lg transition duration-200 flex items-center justify-center gap-2"
          >
            <span>⚡</span>
            <span>Explore Live Demo as Admin (1-Click)</span>
          </button>

          <p className="mt-3 text-xs text-center text-gray-500">
            Live Demo Mode enabled • Admin & visitor features unlocked
          </p>
        </form>
      </div>

      <PopupModal
        isOpen={!!apiError}
        onClose={handleApiErrorModalClose} // Use the new handler
        title="Login Error"
        message={apiError}
        buttonText="Close"
        type="error"
        theme="light"
      />
      <PopupModal
        isOpen={!!error}
        onClose={handleForcedLogoutModalClose} // Use the new handler
        title="You’ve been logged out"
        message={error}
        buttonText="Okay"
        type="warning"
        theme="light"
      />
    </div>
  );
};

export default Login;