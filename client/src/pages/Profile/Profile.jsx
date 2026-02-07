import { useEffect } from "react";
import axios from "axios";
export default function Profile() {
  let access = localStorage.getItem("access_token");
  const fetchProfile = async () => {
    const me = await axios.get("/api/whoami/", {
      headers: { Authorization: `Bearer ${access}` },
    });
    console.log(me.data);
  };
  useEffect(() => {
    fetchProfile();
  }, []);

  return (
    <>
        <h1>Profile Page</h1>       
    </>
  )
}
