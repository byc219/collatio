let sentiment = require('sentiment'),
    stats = require("stats-lite");

function sentimentAnalyzer() {

    const ranking = (content, author) => {
        let tweetText = content.text.replace(/\W+/g, " "),
            retweets = content.share_count || 0,
            favorites = content.vote_count || 0,
            downCount = content.down_count || 0,
            score = content.sentiment.score || 0,
            friends = author.follow_count || 1,
            listed = content.listed_count || 0, //list of members to
            status = content.status_count || 0,
            //mentions = content.mentions_to.length,
            comparative = content.sentiment.comparative;

        let results = 0;
        results += score + Math.abs(score * comparative);
        if(!friends<1){
        	results += (favorites/friends);
        	results += (retweets/friends);
        }else{
        	results+= (favorites/(downCount+favorites))
        }
        //console.log("favorites: ",favorites,friends, (favorites/friends))
        //console.log("RETWEETS: ",retweets, friends, (retweets/friends))
        //results += (retweets!=0?score/Math.abs(score)*(Math.log(retweets)/Math.log(2)):0);
        //results += (favorites!=0?score/Math.abs(score)*(Math.log(favorites)/Math.log(2)):0);
        //results = results / tweetText.length;
        //tweetIndividual.sentiment.w_score = results*100;
        let returnScore = score* Math.abs(comparative);

        return [comparative /*returnScore*/, (Math.abs(Math.log(Math.abs(results))))];
    };

    const normal_dist_data_filter = (content) => {
    	let PositiveSentiments = [];
    	let NegativeSentiments = [];

        let normalized = content.map(function(curr, index, arr) {
        	if(curr[0]<0) NegativeSentiments.push(curr[0])
        	else PositiveSentiments.push(curr[0])
            return curr[0];
        });
        let sentimentsOnly = content.map(function(curr, index, arr) {
            return curr[0];
        });
        normalized.sort(
        	function(a, b) {
  				return a - b;
			});
        let weakMean = stats.mean(normalized);
        let percentile = 0;
        if(stats.mean(normalized)<0){
        	NegativeSentiments.sort(
        	function(a, b) {
  				return a - b;
			});
			percentile = NegativeSentiments.indexOf(weakMean)/NegativeSentiments.length
        }
        else{


        PositiveSentiments.sort(
        	function(a, b) {
  				return a - b;
			});
        percentile = NegativeSentiments.indexOf(weakMean)/NegativeSentiments.length
		}
        let maxVal = normalized[normalized.length-1];
        let minVal = normalized[0];
        let spread = Math.max(Math.abs(minVal),Math.abs(maxVal));
        let weightedSentiment = stats.mean(normalized) / spread;
          //stats.mean(normalized)<0?stats.mean(normalized)/(minVal):stats.mean(normalized)/(maxVal);

        var count = normalized.length;
        return {
            set: content,
            // setSize: normalized.length,
            mean: stats.mean(normalized),
            metricMean: weightedSentiment*100,
            weakMean: percentile,
            median: stats.median(normalized),
            standardDeviation: stats.stdev(normalized),
            mode: stats.mode(normalized),
            variance: stats.variance(normalized)
        };
    };

    const additionalCalc = (content, rankings) =>{

    };
    const extendOn = (on, from) =>{
    	for (let dataKey in from) {
            on[dataKey] = from[dataKey]
        }
    }
    const analyze = (textObject) => {
        let analyzedResults = {};
        let rankingHolder = [];
        let negativeSentiments = 0;
        let positiveSentiments = 0;
        let maxSentimentImpact = {actualTweet:'', sentimentStrength:0, votes:0, posNeg:""};
        for (var postKey in textObject) {
            let curr = textObject[postKey];
            let content = curr.content;
            for (var contentKey in content) {
            	let currentSentiment = sentiment(content[contentKey].text);
                if (currentSentiment.positive.length != 0 || currentSentiment.negative.length != 0) {
                    content[contentKey].sentiment = currentSentiment;

                    if(currentSentiment.score<0)
                    	negativeSentiments++
                    if(currentSentiment.score>0)
                    	positiveSentiments++


                    content[contentKey].sentiment.w_rank = ranking(content[contentKey], textObject[postKey].author);
                    let rankProp = content[contentKey].sentiment.w_rank[1];
                     if(maxSentimentImpact.sentimentStrength <rankProp){
                    	maxSentimentImpact.sentimentStrength = content[contentKey].sentiment.w_rank[0];
                    	maxSentimentImpact.actualTweet = content[contentKey].text;
                    	maxSentimentImpact.votes = content[contentKey].vote_count;
                    	maxSentimentImpact.posNeg = content[contentKey].sentiment<0?"Negative":"Positive"
                    }

                    rankingHolder.push(content[contentKey].sentiment.w_rank);
                }else{
                	delete textObject[postKey].content;
                }
            }
        }

        let normalData = normal_dist_data_filter(rankingHolder);
		negativeSentiments	 = negativeSentiments/rankingHolder.length
		positiveSentiments	 = positiveSentiments/rankingHolder.length
		normalData.percentPositive = positiveSentiments;
		normalData.percentNegative = negativeSentiments;

        let greater = normalData.mean + (2*normalData.standardDeviation);
        let less = normalData.mean - (2*normalData.standardDeviation);
        normalData.set = normalData.set.filter(function(curr){
        	return curr[0]<greater && curr[0]>less;
        });


        let data_W_analysis = {
            data: textObject
        }
        extendOn(data_W_analysis, normalData);
        extendOn(data_W_analysis, maxSentimentImpact);
        // for (let dataKey in normalData) {
        //     data_W_analysis[dataKey] = normalData[dataKey]
        // }
        // for (let dataKey in maxSentimentImpact) {
        //     data_W_analysis[dataKey] = maxSentimentImpact[dataKey]
        // }
        return data_W_analysis;
    };
    return {
        twitter: analyze,
        reddit: analyze
    };
}

module.exports = sentimentAnalyzer();