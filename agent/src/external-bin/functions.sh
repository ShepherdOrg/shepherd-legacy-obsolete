function pullIfLatest(){
	if [ "${LABS_SHEPHERD_VERSION}" = "latest" ]
	then
		echo "pulling latest icelandair/shepherd:${LABS_SHEPHERD_VERSION}"
		docker pull icelandair/shepherd:${LABS_SHEPHERD_VERSION}
	fi
}
export -f pullIfLatest



function generateDeploymentEnv(){
	# Import environment vars from current shell, except for those on the exclusionlist
	compgen -e | sort > ${tmpdir}/completeenvlist.txt
	comm -23 ${tmpdir}/completeenvlist.txt ${THISDIR}/exclusionlist.txt > ${tmpdir}/envlist.txt

	arrayString=$(cat  ${tmpdir}/envlist.txt |tr "\n" " ")
	arr=($arrayString)

	echo "" > ${tmpdir}/_envmap.env # Empty the file
	for i in "${arr[@]}"
	do
            echo $i=\${$i} >> ${tmpdir}/_envmap.env
	done

	cat ${tmpdir}/_envmap.env | envsubst  > ${tmpdir}/_parameterlist.env
}
export -f generateDeploymentEnv
