import { useState } from "react";
import { login, loginWithGoogle } from "../firebase/auth";
import logo from "../assets/logo.jpeg";
export default function Login() {

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleLogin() {
    try {
      await login(email, password);
    } catch (error) {
      console.error(error);
      alert("Error al iniciar sesión");
    }
  }

  async function handleGoogle() {
    try {
      await loginWithGoogle();
    } catch (error) {
      console.error(error);
      alert("Error con Google");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-surface)]">
      <div className="bg-white p-8 rounded-xl shadow-md w-full max-w-sm border border-[var(--color-line)]">
        
        <div className="flex justify-center mb-6">
        <img 
            src={logo} 
            alt="Corvasc Devices" 
            className="h-20 object-contain"
        />
    </div>
        <h2 className="text-xl font-bold mb-4 text-center">
          Iniciar sesión
        </h2>

        <input
          type="email"
          placeholder="Correo"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="w-full mb-3 p-2 border rounded"
        />

        <input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="w-full mb-4 p-2 border rounded"
        />

        <button
          onClick={handleLogin}
          className="w-full bg-[var(--color-red)] text-white py-2 rounded mb-2"
        >
          Iniciar sesión
        </button>

        <button
          onClick={handleGoogle}
          className="w-full border py-2 rounded"
        >
          Entrar con Google
        </button>

      </div>
    </div>
  );
}