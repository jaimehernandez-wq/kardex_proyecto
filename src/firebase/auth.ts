import {
    createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User
} from "firebase/auth"
import {auth, googleProvider} from "./config";
import { sign } from "crypto";
import { unsubscribe } from "diagnostics_channel";

// registro de usuario
export const register =(email: string, password: string)=>{
    return  createUserWithEmailAndPassword(auth, email, password);

}

//login de usuario
export const login=(email: string, password: string)=>{
    return signInWithEmailAndPassword(auth, email, password);
}

// login con google 
export const loginWithGoogle=()=>{
    return signInWithPopup(auth, googleProvider);

}

// logout 
export const logout = ()=>{
    return signOut(auth);

}

//observer
export function onAuthChange(callback:(user: User | null)=> void){
    const unsubscribe = onAuthStateChanged(auth, function(user){
        if(user!== null){
            callback(user);
        }else{
            callback(null);
        }
    });
    return unsubscribe
}
