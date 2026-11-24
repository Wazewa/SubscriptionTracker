import logo from "../assets/icons/logo.svg";
import loginLogo from "../assets/icons/logo-login.svg";
interface LogoProps {
  subtitle?: string;
  compact?: boolean;
}

export default function Logo({
  subtitle = "Создайте аккаунт и начните пользоваться трекером",
  compact = false,
}: LogoProps) {
  return (
    <div className="flex flex-col items-center text-center">
        <img
        src={compact ? loginLogo : logo}
        alt="Логотип Трекера подписок"
        className={compact ? "h-[116px] w-[116px] rounded-4xl object-contain" : "h-[134px] w-[134px] rounded-4xl object-contain"}
        />

      <h1 className={`font-unbounded mt-1 font-bold tracking-tight text-[#092b08] ${compact ? "whitespace-nowrap text-[clamp(20px,5.8vw,32px)] leading-[1.1]" : "text-[38px] leading-tight"}`}>
        Трекер подписок
      </h1>

      <p className={`${compact ? "max-w-[220px] text-[13px] leading-[16px]" : "mt-1 max-w-[250px] text-sm leading-[18px]"} font-bold text-[#858b85]`}>
        {subtitle}
      </p>
    </div>
  );
}
