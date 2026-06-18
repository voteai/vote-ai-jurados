import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Heart, CheckCircle, User } from "lucide-react";

export default function ParticipantVoteCard({ participant, hasVoted, isVoting, onVote, voteCount }) {
  return (
    <Card className={`transition-all duration-200 ${hasVoted ? "border-pink-400 shadow-md shadow-pink-100" : "hover:shadow-md"}`}>
      <CardContent className="pt-5 pb-4">
        <div className="flex items-center gap-4">
          {participant.photo_url ? (
            <img src={participant.photo_url} alt={participant.name}
              className="w-14 h-14 rounded-full object-cover border-2 border-gray-200 flex-shrink-0" />
          ) : (
            <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
              <User className="w-6 h-6 text-gray-400" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 truncate">{participant.name}</p>
            {participant.code && <p className="text-xs text-gray-400">#{participant.code}</p>}
            {participant.description && (
              <p className="text-xs text-gray-500 mt-1 line-clamp-2">{participant.description}</p>
            )}
          </div>
          <div className="flex flex-col items-center gap-1 flex-shrink-0">
            <Button
              size="sm"
              onClick={() => onVote(participant)}
              disabled={hasVoted || isVoting}
              className={`gap-1.5 ${hasVoted ? "bg-pink-500 hover:bg-pink-500 text-white" : "bg-pink-500 hover:bg-pink-600 text-white"}`}
            >
              {hasVoted
                ? <><CheckCircle className="w-4 h-4" /> Votado</>
                : <><Heart className="w-4 h-4" /> Votar</>
              }
            </Button>
            {voteCount > 0 && (
              <span className="text-xs text-gray-400">{voteCount} voto{voteCount !== 1 ? "s" : ""}</span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}