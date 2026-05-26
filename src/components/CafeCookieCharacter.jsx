import React from "react";
import "./CafeCookieCharacter.css";
import tsurebenCookie from "../assets/tsureben-cookie.svg";

function CafeCookieCharacter({ mood = "idle" }) {
  const moodTextMap = {
    idle: "カリッとひと口、気分転換しよっか。",
    happy: "その調子！ごほうびクッキー、用意しておくね。",
    tired: "ちょっと糖分チャージして、ゆっくり戻ろう。",
  };

  const text = moodTextMap[mood] || moodTextMap.idle;

  return (
    <div className={`cafe-cookie-wrapper cafe-cookie-wrapper--${mood}`}>
      <div className="cafe-cookie-shadow" />
      <img
        src={tsurebenCookie}
        alt="TsureBenクッキーキャラクター"
        className="cafe-cookie-image"
      />
      <div className="cafe-cookie-speech">
        <p>{text}</p>
      </div>
    </div>
  );
}

export default CafeCookieCharacter;

