import React from "react";
import "./CafeMugNekoCharacter.css";
import tsurebenMugNeko from "../assets/tsureben-mug-neko.svg";

function CafeMugNekoCharacter({ mood = "idle" }) {
  const moodTextMap = {
    idle: "おつかれさま。ここで一杯、ほっとしていこ。",
    happy: "ナイス集中！この調子で、もう一ページいってみよっか。",
    tired: "ふう…深呼吸して、あったかい一口からいこ。",
  };

  const text = moodTextMap[mood] || moodTextMap.idle;

  return (
    <div className={`cafe-mugneko-wrapper cafe-mugneko-wrapper--${mood}`}>
      <div className="cafe-mugneko-shadow" />
      <img
        src={tsurebenMugNeko}
        alt="TsureBenマグねこキャラクター"
        className="cafe-mugneko-image"
      />
      <div className="cafe-mugneko-speech">
        <p>{text}</p>
      </div>
    </div>
  );
}

export default CafeMugNekoCharacter;

