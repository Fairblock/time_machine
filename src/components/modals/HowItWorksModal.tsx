import Link from "next/link";
import { CircleX } from "lucide-react";

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
        className="relative bg-white border rounded-xl border-[#DCDCDC] lg:w-1/2 xl:w-3/5"
      >
        <button
          onClick={() => setShowModal(false)}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          <CircleX size={22} />
        </button>

        <div className="flex flex-col gap-2 m-4 lg:my-0 lg:mx-auto p-10 rounded-xl">
          <h2 className="font-bold mb-2 text-center text-4xl">HOW IT WORKS</h2>
          <p className="">
            Every 3 days, a new token is revealed. <br />{" "}
            <span className="font-semibold">Your mission:</span> predict the
            token’s price at the end of the 3-day round but do it now.
          </p>
          <ul className="ml-5 list-decimal list-outside">
            <li>
              Predict the price of the current token (for the end of the 3-day
              round).
            </li>
            <li>Encrypt your prediction, no one can see it, even us.</li>
            <li>
              Wait for the round to end. MPC validators will collaborate to
              decrypt and post scores onchain.
            </li>
            <li>
              Repeat across all 4 rounds. (4 tokens · 3 days each · 2 weeks)
            </li>
          </ul>
          <p>
            <span className="font-semibold">Time Matters:</span> The earlier you
            encrypt your prediction, the more you earn.
            <br />
            <br />
            <span className="font-semibold">
              Get boosters on your predictions to get more points
            </span>
            <br /> Day 1: 1.5× points <br />
            Day 2: 1.25× points
            <br />
            Day 3: 1.0× points
            <br /> <br />
            Share on X: +200 bonus points
            <br />
            <br />
            It’s like options or Polymarket. Just simpler, with asymmetric
            payoffs. No greeks. No frontrunning. No manipulation.
          </p>
          <p className="">
  Refer to the complete{" "}
  <a
    href="https://fairblock.notion.site/Guide-to-Fairblock-Time-Machine-226ee984fb4e80a48c72cfd928b979c2"
    target="_blank"
    rel="noopener noreferrer"
  >
    <span className="font-semibold underline">guide</span>
  </a>{" "}
  <br />
  Need help? Join our{" "}
  <a
    href="https://discord.gg/fairblock"
    className="font-semibold underline"
    target="_blank"
    rel="noopener noreferrer"
  >
    Discord
  </a>
</p>

          <Link
            className="bg-black font-medium mx-auto mt-4 px-6 py-2 rounded-xl text-white text-lg w-fit"
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
