import React, { useEffect, useState } from "react";

function App() {
  const [members, setMembers] = useState([]);

  useEffect(() => {
    fetch("http://localhost:5000/members")
      .then((res) => res.json())
      .then((data) => setMembers(data.members))
      .catch((err) => console.error(err));
  }, []);

  return (
    <div>
      {members.map((member, index) => (
        <div key={index}>{member}</div>
      ))}
    </div>
  );
}

export default App;
