import Meta from '../../utils/Meta';
import iVisitLogo from '../../assets/images/logo.png';

export default function NotFound() {
  Meta({ title: '404 Not Found' });

  return (
    <div className="min-h-screen p-10 grid place-items-center bg-[url(/background.png)] bg-no-repeat bg-cover">
      <div className="size-full max-w-[70em] h-fit py-32 flex flex-col gap-4 justify-between items-center bg-white/10 rounded-xl backdrop-blur-lg">
        <div className="relative w-fit">
          <img
            className="w-60 h-auto
              [mask-image:linear-gradient(to_bottom,black,transparent)]
              [mask-repeat:no-repeat]
              [mask-size:100%_100%]
              [-webkit-mask-image:linear-gradient(to_bottom,black,transparent)]
              [-webkit-mask-repeat:no-repeat]
              [-webkit-mask-size:100%_100%]"
            src={iVisitLogo}
            alt="Logo"
          />
          <span className="absolute inset-0 flex items-end justify-center text-white text-8xl font-tomorrow">
            404
          </span>
        </div>

        <h3 className="text-white text-2xl mb-10">Page Not Found</h3>
      </div>
    </div>
  );
}
