import React, { Component } from 'react';
import dockerring from './onering-blackback.jpeg';
import './App.css';
import Deployerset from './deployerset/Deployerset'
class App extends Component {
  render() {
    return (
      <div className="App">

        <header className="App-header">
            <img height="40px" src={dockerring} alt="DockerRing"></img>
           <span className="App-title">Shepherd </span><span className="App-subtitle"> One deployer to rule them all</span>
        </header>
        <Deployerset/>
      </div>
    );
  }
}

export default App;
