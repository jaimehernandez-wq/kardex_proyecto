import { collection, getDocs} from "firebase/firestore";
import { db } from "./config";

export const getCollection= async(name: string)=>{

    const snapshot= await getDocs(collection(db, name));
    
    return snapshot.docs.map(doc=>({
        id: doc.id,
        ...doc.data()

    }));
};


