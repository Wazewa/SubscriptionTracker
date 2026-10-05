import logo from "../assets/icons/logo.svg";
interface LogoProps {
  subtitle?: string;
}

export default function Logo({
  subtitle = "Создайте аккаунт и начните пользоваться трекером",
}: LogoProps) {
  return (
    <div className="flex flex-col items-center text-center">
        <img
        src={logo}
        alt="Логотип Трекера подписок"
        className="h-[134px] w-[134px] rounded-4xl object-contain"
        />

      <h1 className="font-unbounded mt-1 text-[38px] font-bold leading-tight tracking-tight text-[#092b08]">
        Трекер подписок
      </h1>

      <p className="mt-1 max-w-[250px] text-sm font-bold leading-[18px] text-[#858b85]">
        {subtitle}
      </p>
    </div>
  );
}