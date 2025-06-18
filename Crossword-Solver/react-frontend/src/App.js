import React, { useState, useEffect } from 'react';
 

function App() {
  const [data, setData] = useState([{}])
   
useEffect(() => {
  fetch("/members")
    .then(response => {
      console.log("Raw response:", response);
      return response.json();
    })
    .then(data => {
      console.log("Parsed JSON:", data);
      setData(data);
    })
    .catch(error => {
      console.error("Fetch error:", error);
    });
}, []);


  return (
    <div>
      {(typeof data.members === 'undefined')?(
        <p>Loading...</p>
      ): (
        data.members.map((member, i) => (
          <p key={i}>{member}</p>
        ))
      )}
    </div>
  );
}

export default App;
