import React from "react";
import "./CafeMarshmallowCharacter.css";
import tsurebenMarshmallow from "../assets/tsureben-marshmallow.svg";

function CafeMarshmallowCharacter({ mood = "idle" }) {
  const moodTextMap = {
    idle: "ふわっとひと息つきながら、今日の計画どうする？",
    happy: "いいね、その調子でもう少しだけがんばろ！",
    tired: "とろ〜りマシュマロタイム。少し肩の力を抜こっか。",
  };

  const text = moodTextMap[mood] || moodTextMap.idle;

  return (
    <div className={`cafe-marsh-wrapper cafe-marsh-wrapper--${mood}`}>
      <div className="cafe-marsh-shadow" />
      <img
        src={tsurebenMarshmallow}
        alt="TsureBenマシュマロキャラクター"
        className="cafe-marsh-image"
      />
      <div className="cafe-marsh-speech">
        <p>{text}</p>
      </div>
    </div>
  );
}

export default CafeMarshmallowCharacter;

