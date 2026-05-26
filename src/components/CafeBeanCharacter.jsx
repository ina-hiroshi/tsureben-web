import React from "react";
import "./CafeBeanCharacter.css";
import tsurebenBean from "../assets/tsureben-bean.svg";

/**
 * TsureBen のカフェキャラクターを表示するコンポーネントです。
 * props.mood によって軽いアニメーションや表情用の吹き出しを切り替えられます。
 */
function CafeBeanCharacter({ mood = "idle" }) {
  const moodTextMap = {
    idle: "ようこそ、TsureBenカフェへ。",
    happy: "いい感じ！今日も勉強が進んでるね！",
    tired: "おつかれさま…。少し休憩しようか？",
  };

  const text = moodTextMap[mood] || moodTextMap.idle;

  return (
    <div className={`cafe-bean-wrapper cafe-bean-wrapper--${mood}`}>
      <div className="cafe-bean-shadow" />
      <img
        src={tsurebenBean}
        alt="TsureBenカフェキャラクター"
        className="cafe-bean-image"
      />
      <div className="cafe-bean-speech">
        <p>{text}</p>
      </div>
    </div>
  );
}

export default CafeBeanCharacter;
