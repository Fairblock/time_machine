import Link from "next/link";
import { CircleX, Discor } from "lucide-react";

const HowItWorksModal = ({
  setShowModal,
}: {
  setShowModal: React.Dispatch<React.SetStateAction<boolean>>;
}) => {
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/40 overflow-y-auto"
      onClick={() => setShowModal(false)}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative bg-white border rounded-xl border-[#DCDCDC] lg:w-1/2 xl:w-2/5"
      >
        <button
          onClick={() => setShowModal(false)}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          <CircleX size={22} />
        </button>

        <div className="flex flex-col gap-8 m-4 lg:my-0 lg:mx-auto p-12 rounded-xl">
          <h2 className="font-bold text-center text-4xl">HOW IT WORKS</h2>
          <p className="">
            Time Machine allows you to encrypt your prediction. every week we
            will add 2 tokens for the next 2 weeks, meaning everyone can guess
            what will be the price and encrypt prediction to earn points. the
            closer your prediction the more points you will get.
          </p>
          <ul className="text-lg ml-5">
            <li className="list-disc list-outside">
              <span className="font-medium">Step 1:</span> Guess what its price
              will be next week for the given token.
            </li>
            <li className="list-disc list-outside">
              <span className="font-medium">Step 2:</span> Enter you prediction
              and encrypt it.
            </li>
            <li className="list-disc list-outside">
              <span className="font-medium">Step 3:</span> Wait till it got
              decrypted and earn points.
            </li>
          </ul>
          <p className="">Need help? Join our <a className="font-medium" href="https://discord.gg/fairblock">Discord</a></p>
          <Link
            className="bg-black font-medium mx-auto px-6 py-2 rounded-xl text-white text-lg w-fit"
            href={"/prediction"}
            onClick={() => setShowModal(false)}
          >
            I'm ready to predict
          </Link>
        </div>
      </div>
    </div>
  );
};

export default HowItWorksModal;
